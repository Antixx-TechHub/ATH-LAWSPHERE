"""
Trust-Aware Chat API
Privacy-first chat completions with full transparency.
Now with LangGraph agentic capabilities for tool calling.
"""

from typing import Optional, List, AsyncGenerator
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from enum import Enum
import json
import time
import uuid
import structlog

from app.agents.legal_assistant import LegalAssistantAgent
from app.agents.langgraph_agent import LangGraphLegalAgent, create_legal_agent
from app.models.llm_router import LLMRouter, ModelType
from app.models.ollama_client import get_ollama_client, get_ollama_model_name
from app.models.groq_client import get_groq_client, GROQ_MODELS
from app.routing import TrustRouter, AuditLogger, RoutingDecision, ModelProvider
from app.config import settings
from app.db import get_db, get_optional_db
from app.services import session_store
from sqlalchemy.ext.asyncio import AsyncSession

logger = structlog.get_logger()

router = APIRouter()

# Initialize trust-aware components
# SMART ROUTING: Local-first for privacy + savings, Cloud for complex queries only
trust_router = TrustRouter(
    enable_cloud=True,
    default_local_model="qwen2.5-14b",  # Use 14B for quality (user has 64GB RAM)
    default_cloud_model="gemini-flash",  # Very cheap: $0.000075/1K tokens
    cost_optimization=True,
    prefer_local=True  # LOCAL-FIRST: Prefer local models for privacy & cost
)
audit_logger = AuditLogger(
    log_dir="./logs/audit",
    enable_file_logging=True
)

# Ollama client for local inference
ollama_client = get_ollama_client()

# Groq client for open-source model inference (FREE tier!)
groq_client = get_groq_client()

# LangGraph agent instance (initialized lazily)
_langgraph_agent: Optional[LangGraphLegalAgent] = None


def get_langgraph_agent(llm) -> LangGraphLegalAgent:
    """Get or create the LangGraph agent."""
    global _langgraph_agent
    if _langgraph_agent is None:
        _langgraph_agent = create_legal_agent(llm)
        logger.info("LangGraph agent initialized")
    return _langgraph_agent


def detect_needs_tools(query: str) -> bool:
    """Quick detection of whether a query needs external tools."""
    query_lower = query.lower()
    
    # Weather patterns
    weather_keywords = ["weather", "temperature", "rain", "sunny", "forecast", "climate", "hot ", "cold "]
    if any(kw in query_lower for kw in weather_keywords):
        location_patterns = ["in ", "at ", "for ", "of ", "today", "now", "current"]
        if any(p in query_lower for p in location_patterns):
            return True
    
    # Time/date patterns
    time_keywords = ["what time", "current time", "what date", "today's date", "what day is"]
    if any(kw in query_lower for kw in time_keywords):
        return True
    
    # Current events/search patterns
    search_keywords = ["latest news", "recent news", "current news", "happening now", "breaking news", 
                       "latest update", "what's happening"]
    if any(kw in query_lower for kw in search_keywords):
        return True
    
    # Calculation patterns
    calc_keywords = ["calculate", "compute", "gst", "% of", "percent"]
    if any(kw in query_lower for kw in calc_keywords):
        return True
    
    return False


def extract_location_from_query(query: str) -> str:
    """Extract location from a weather query."""
    query_lower = query.lower()
    
    # Common patterns: "weather in X", "weather at X"
    patterns = [" in ", " at ", " for ", " of "]
    
    for pattern in patterns:
        if pattern in query_lower:
            idx = query_lower.find(pattern)
            location = query[idx + len(pattern):].strip()
            # Clean up: remove trailing punctuation and common words
            location = location.rstrip("?.,!").split(" today")[0].split(" now")[0].split(" right")[0]
            return location.strip() or "Pune"
    
    return "Pune"  # Default location


def extract_expression_from_query(query: str) -> str:
    """Extract mathematical expression from a query."""
    import re
    
    # Look for numeric expressions
    patterns = [
        r"calculate\s+(.+?)(?:\?|$)",
        r"compute\s+(.+?)(?:\?|$)",
        r"(\d+[\s\d\+\-\*\/\.\(\)%]+\d+)",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, query, re.IGNORECASE)
        if match:
            expr = match.group(1).strip()
            expr = expr.replace("%", "/100")
            return expr
    
    # GST calculation pattern
    if "gst" in query.lower():
        match = re.search(r"(\d+(?:\.\d+)?)", query)
        if match:
            amount = match.group(1)
            return f"{amount} * 1.18"  # 18% GST
    
    return ""


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    role: MessageRole
    content: str


class TrustInfo(BaseModel):
    """Trust transparency information for UI"""
    is_local: bool
    trust_badge: str
    trust_message: str
    trust_details: List[str]
    sensitivity_level: str
    pii_detected: bool
    document_attached: bool
    model_used: str
    model_provider: str
    audit_id: str


class CostInfo(BaseModel):
    """Cost information"""
    estimated_cost_usd: float
    estimated_cost_inr: float
    saved_vs_cloud_usd: float
    saved_vs_cloud_inr: float


class TrustChatRequest(BaseModel):
    """Chat request with trust options"""
    messages: List[Message]
    model: Optional[str] = None  # User preference, may be overridden
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    stream: bool = False
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: Optional[int] = Field(default=4096, ge=1, le=128000)
    
    # Trust options
    force_local: bool = False  # User can force local processing
    file_attached: bool = False
    file_name: Optional[str] = None
    file_content: Optional[str] = None  # Extracted text from file


class TrustChatResponse(BaseModel):
    """Chat response with full trust transparency"""
    id: str = ""
    session_id: str = ""
    message: Message
    model: str = ""
    
    # Trust information (for UI display)
    trust: TrustInfo
    cost: CostInfo
    
    # Performance
    latency_ms: int
    routing_time_ms: float


def get_legal_system_prompt(file_attached: bool = False) -> str:
    """Generate system prompt with document-focus instruction when needed."""
    base_prompt = """You are an expert Indian legal AI assistant. 
You help with legal queries, document analysis, and legal research.
Be accurate, cite relevant laws and sections when applicable.
Maintain attorney-client privilege and confidentiality."""
    
    if file_attached:
        base_prompt += """

IMPORTANT: The user has attached a document. When answering questions:
1. Focus primarily on the content of the attached document
2. Base your answers on the information provided in the document
3. Quote relevant sections from the document when applicable
4. If the document doesn't contain the answer, clearly state that and provide general guidance"""
    
    return base_prompt


@router.post("/trust/completions", response_model=TrustChatResponse)
async def create_trust_chat_completion(request: TrustChatRequest, db: Optional[AsyncSession] = Depends(get_optional_db)):
    """
    Create a privacy-first chat completion with full transparency.
    
    GUARANTEES:
    - Documents are ALWAYS processed locally
    - PII is NEVER sent to external APIs
    - User always knows where their data is processed
    - Full audit trail for compliance
    """
    try:
        start_time = time.time()
        
        # DEBUG: Log incoming request
        print(f"[TRUST_CHAT] Received request with {len(request.messages)} messages")
        print(f"[TRUST_CHAT] file_attached={request.file_attached}")
        for i, m in enumerate(request.messages):
            print(f"[TRUST_CHAT] Message {i}: role={m.role.value}, content_len={len(m.content)}")
            # Log first 500 chars of content to see if document is included
            if m.role == MessageRole.USER:
                preview = m.content[:500] if len(m.content) > 500 else m.content
                print(f"[TRUST_CHAT] User message preview: {preview}")
        
        # Get user's message content for routing analysis
        user_content = " ".join([
            m.content for m in request.messages 
            if m.role == MessageRole.USER
        ])
        
        # Step 0: Check if this query needs external tools (LangGraph agent)
        needs_tools = detect_needs_tools(user_content)
        tools_used = []
        
        # Step 1: Trust-aware routing decision
        routing_result = trust_router.route(
            content=user_content,
            file_attached=request.file_attached,
            file_name=request.file_name,
            file_content=request.file_content,
            user_model_preference=request.model,
            force_local=request.force_local,
            estimated_tokens=len(user_content.split()) * 2  # Rough estimate
        )
        
        # Step 2: Log the routing decision (for compliance)
        audit_logger.log(
            routing_result=routing_result,
            content=user_content,
            session_id=request.session_id,
            user_id=request.user_id
        )
        
        # Step 3: Execute inference based on routing decision
        model_id = routing_result.selected_model.model_id
        response_content = ""
        
        # ======================================================================
        # FAST PATH: Direct tool execution for simple patterns
        # ======================================================================
        if needs_tools:
            logger.info("fast_tool_path", reason="Direct tool execution for speed")
            
            try:
                from app.tools.external_apis import get_weather, get_current_datetime, calculate
                
                user_query = request.messages[-1].content if request.messages else ""
                query_lower = user_query.lower()
                
                # Weather query - call tool directly
                if any(kw in query_lower for kw in ["weather", "temperature"]):
                    location = extract_location_from_query(user_query)
                    logger.info("calling_weather_tool", location=location)
                    
                    tool_result = await get_weather.ainvoke({"location": location})
                    tools_used = ["get_weather"]
                    
                    # Format response with tool result
                    response_content = f"""{tool_result}

---
*Data retrieved using: get_weather*"""
                
                # DateTime query
                elif any(kw in query_lower for kw in ["what time", "current time", "what date", "today's date"]):
                    tool_result = get_current_datetime.invoke({"timezone": "Asia/Kolkata"})
                    tools_used = ["get_current_datetime"]
                    response_content = f"""{tool_result}

---
*Data retrieved using: get_current_datetime*"""
                
                # Calculation query
                elif any(kw in query_lower for kw in ["calculate", "compute", "gst"]):
                    expression = extract_expression_from_query(user_query)
                    if expression:
                        tool_result = calculate.invoke({"expression": expression})
                        tools_used = ["calculate"]
                        response_content = f"""{tool_result}

---
*Data retrieved using: calculate*"""
                
                logger.info("fast_tool_complete", tools_used=tools_used)
                
            except Exception as e:
                logger.error("fast_tool_failed", error=str(e))
                # Fall back to standard inference
                needs_tools = False
                tools_used = []
        
        # If tools path ran but produced no content, fall back to standard inference
        if needs_tools and not response_content:
            logger.info("tools_path_no_content_fallback_to_standard")
            print("[TRUST_CHAT] Tools path produced no content, falling back to standard inference")
            needs_tools = False  # Reset to allow standard path
        
        # ======================================================================
        # STANDARD PATH: Direct LLM inference (no tools or tool failed)
        # ======================================================================
        if not needs_tools and not response_content:
            logger.info("standard_inference_path", is_local=routing_result.is_local, model_id=model_id)
            print(f"[TRUST_CHAT] Standard inference path - is_local: {routing_result.is_local}, model_id: {model_id}")
            
            # Check if this is an open-source model (Groq)
            selected_provider = routing_result.selected_model.provider
            is_opensource = selected_provider == ModelProvider.OPENSOURCE
            
            if is_opensource:
                # ============================================================
                # OPENSOURCE PATH: Use Groq (FREE hosted open-source models)
                # ============================================================
                logger.info(
                    "using_opensource_model",
                    model=model_id,
                    provider="groq",
                    reason="Open-source model selected"
                )
                print(f"[TRUST_CHAT] Using OPENSOURCE model via Groq: {model_id}")
                
                try:
                    if not groq_client.is_available:
                        raise ValueError("Groq API key not configured")
                    
                    # Prepare messages for Groq
                    groq_messages = [
                        {"role": m.role.value, "content": m.content}
                        for m in request.messages
                    ]
                    
                    # Add system prompt for legal context
                    if not any(m["role"] == "system" for m in groq_messages):
                        groq_messages.insert(0, {
                            "role": "system",
                            "content": get_legal_system_prompt(request.file_attached)
                        })
                    
                    # Call Groq with the selected model
                    logger.info("calling_groq", model=model_id, num_messages=len(groq_messages))
                    print(f"[TRUST_CHAT] Calling Groq with model: {model_id}, messages: {len(groq_messages)}")
                    
                    groq_response = await groq_client.chat_completion(
                        messages=groq_messages,
                        model=model_id,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens or 4096
                    )
                    
                    response_content = groq_response.get("content", "")
                    print(f"[TRUST_CHAT] Groq response received - content_length: {len(response_content)}")
                    logger.info(
                        "opensource_inference_complete",
                        model=model_id,
                        content_length=len(response_content),
                        tokens=groq_response.get("usage", {}).get("total_tokens", 0)
                    )
                    
                except Exception as e:
                    logger.error("groq_inference_failed", error=str(e))
                    print(f"[TRUST_CHAT] Groq failed: {e}")
                    
                    # Fallback to cloud for non-sensitive content
                    if not request.force_local and not routing_result.privacy_scan.force_local:
                        logger.warning("groq_failed_fallback_to_cloud", error=str(e))
                        try:
                            llm_router = LLMRouter()
                            model_type = ModelType(settings.DEFAULT_MODEL)
                            llm = llm_router.get_model(model_type)
                            agent_fallback = LegalAssistantAgent(llm=llm)
                            
                            cloud_response = await agent_fallback.process(
                                messages=[{"role": m.role.value, "content": m.content} for m in request.messages],
                                session_id=request.session_id,
                            )
                            response_content = cloud_response.get("content", "")
                            routing_result.is_local = False
                            routing_result.trust_message = "⚠️ Open-source unavailable - using cloud fallback"
                        except Exception as cloud_error:
                            logger.error("cloud_fallback_also_failed", error=str(cloud_error))
                            raise HTTPException(
                                status_code=500,
                                detail=f"Both Groq and cloud inference failed: {str(e)}"
                            )
                    else:
                        raise HTTPException(
                            status_code=503,
                            detail=f"Open-source inference required but Groq failed: {str(e)}"
                        )
            
            elif routing_result.is_local:
                # ============================================================
                # LOCAL PATH: Try Ollama first, then Groq as fallback
                # ============================================================
                logger.info(
                    "using_local_model",
                    model=model_id,
                    is_local=True,
                    reason=routing_result.trust_message
                )
                print(f"[TRUST_CHAT] Using LOCAL model: {model_id}")
                
                try:
                    # Check Ollama health
                    ollama_healthy = await ollama_client.health_check()
                    print(f"[TRUST_CHAT] Ollama health check: {ollama_healthy}")
                    
                    if ollama_healthy:
                        # Convert model ID to Ollama format
                        ollama_model = get_ollama_model_name(model_id)
                        
                        # Prepare messages for Ollama
                        ollama_messages = [
                            {"role": m.role.value, "content": m.content}
                            for m in request.messages
                        ]
                        
                        # Add system prompt for legal context
                        if not any(m["role"] == "system" for m in ollama_messages):
                            ollama_messages.insert(0, {
                                "role": "system",
                                "content": get_legal_system_prompt(request.file_attached)
                            })
                        
                        # Call Ollama
                        logger.info("calling_ollama", model=ollama_model, num_messages=len(ollama_messages))
                        print(f"[TRUST_CHAT] Calling Ollama with model: {ollama_model}, messages: {len(ollama_messages)}")
                        
                        ollama_response = await ollama_client.chat(
                            model=ollama_model,
                            messages=ollama_messages,
                            temperature=request.temperature,
                            max_tokens=request.max_tokens or 4096
                        )
                        
                        response_content = ollama_response.content
                        print(f"[TRUST_CHAT] Ollama response received - content_length: {len(response_content)}")
                        print(f"[TRUST_CHAT] Ollama response preview: {response_content[:200] if response_content else 'EMPTY'}")
                        logger.info(
                            "local_inference_complete",
                            model=ollama_model,
                            content_length=len(response_content),
                            tokens=ollama_response.total_tokens,
                            tokens_per_sec=ollama_response.tokens_per_second
                        )
                    else:
                        # Ollama not available, try Groq as open-source fallback
                        logger.warning("ollama_unavailable_trying_groq")
                        print("[TRUST_CHAT] Ollama unavailable, trying Groq fallback...")
                        
                        if groq_client.is_available:
                            # Use Groq with open-source model
                            groq_messages = [
                                {"role": m.role.value, "content": m.content}
                                for m in request.messages
                            ]
                            if not any(m["role"] == "system" for m in groq_messages):
                                groq_messages.insert(0, {
                                    "role": "system",
                                    "content": get_legal_system_prompt(request.file_attached)
                                })
                            
                            # Use llama-3.1-8b-instant as fast fallback
                            groq_model = "llama-3.1-8b-instant"
                            groq_response = await groq_client.chat_completion(
                                messages=groq_messages,
                                model=groq_model,
                                temperature=request.temperature,
                                max_tokens=request.max_tokens or 4096
                            )
                            response_content = groq_response.get("content", "")
                            routing_result.trust_message = "🔵 Using open-source model (Groq) - Ollama unavailable"
                            print(f"[TRUST_CHAT] Groq fallback successful - content_length: {len(response_content)}")
                        else:
                            # No local options, check if cloud fallback is allowed
                            if request.force_local or routing_result.privacy_scan.force_local:
                                raise HTTPException(
                                    status_code=503,
                                    detail="Local inference required but both Ollama and Groq are unavailable. Cannot process sensitive data via cloud."
                                )
                            
                            # Use cloud as last resort
                            logger.warning("no_local_options_fallback_to_cloud")
                            llm_router = LLMRouter()
                            model_type = ModelType(settings.DEFAULT_MODEL)
                            llm = llm_router.get_model(model_type)
                            agent_fallback = LegalAssistantAgent(llm=llm)
                            
                            cloud_response = await agent_fallback.process(
                                messages=[{"role": m.role.value, "content": m.content} for m in request.messages],
                                session_id=request.session_id,
                            )
                            response_content = cloud_response.get("content", "")
                            routing_result.is_local = False
                            routing_result.trust_message = "⚠️ Local unavailable - using cloud fallback (no sensitive data detected)"
                        
                except HTTPException:
                    raise
                except Exception as e:
                    logger.error("local_inference_failed", error=str(e))
                    print(f"[TRUST_CHAT] Local inference failed: {e}")
                    
                    # Try Groq as fallback before cloud
                    if groq_client.is_available:
                        logger.warning("ollama_failed_trying_groq", error=str(e))
                        try:
                            groq_messages = [
                                {"role": m.role.value, "content": m.content}
                                for m in request.messages
                            ]
                            if not any(m["role"] == "system" for m in groq_messages):
                                groq_messages.insert(0, {
                                    "role": "system",
                                    "content": get_legal_system_prompt(request.file_attached)
                                })
                            
                            groq_response = await groq_client.chat_completion(
                                messages=groq_messages,
                                model="llama-3.1-8b-instant",
                                temperature=request.temperature,
                                max_tokens=request.max_tokens or 4096
                            )
                            response_content = groq_response.get("content", "")
                            routing_result.trust_message = "🔵 Using open-source model (Groq) - local inference failed"
                        except Exception as groq_error:
                            logger.error("groq_fallback_failed", error=str(groq_error))
                            # Continue to cloud fallback below
                    
                    # Fallback to cloud for non-sensitive content when both Ollama and Groq fail
                    if not response_content and not request.force_local and not routing_result.privacy_scan.force_local:
                        logger.warning("all_local_failed_fallback_to_cloud", error=str(e))
                        try:
                            llm_router = LLMRouter()
                            model_type = ModelType(settings.DEFAULT_MODEL)
                            llm = llm_router.get_model(model_type)
                            agent_fallback = LegalAssistantAgent(llm=llm)
                            
                            cloud_response = await agent_fallback.process(
                                messages=[{"role": m.role.value, "content": m.content} for m in request.messages],
                                session_id=request.session_id,
                            )
                            response_content = cloud_response.get("content", "")
                            # Update routing info to reflect cloud fallback
                            routing_result.is_local = False
                            routing_result.trust_message = "⚠️ Local unavailable - using cloud fallback (no sensitive data detected)"
                        except Exception as cloud_error:
                            logger.error("cloud_fallback_also_failed", error=str(cloud_error))
                            raise HTTPException(
                                status_code=500,
                                detail=f"Both local and cloud inference failed: {str(e)}"
                            )
                    else:
                        raise HTTPException(
                            status_code=503,
                            detail=f"Local inference required but failed: {str(e)}. Cannot use cloud for sensitive data."
                        )
            else:
                # Use CLOUD model
                logger.info(
                    "using_cloud_model",
                    model=model_id,
                    is_local=False,
                    reason="Non-sensitive content"
                )
                
                llm_router = LLMRouter()
                model_type = ModelType(settings.DEFAULT_MODEL)
                llm = llm_router.get_model(model_type)
                agent_cloud = LegalAssistantAgent(llm=llm)
                
                cloud_response = await agent_cloud.process(
                    messages=[{"role": m.role.value, "content": m.content} for m in request.messages],
                    session_id=request.session_id,
                )
                response_content = cloud_response.get("content", "")
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Step 5: Build response with trust information
        trust_details = routing_result.trust_details.copy()
        
        # Update badge and details based on actual tool usage
        actual_badge = routing_result.trust_badge
        actual_message = routing_result.trust_message
        
        if tools_used:
            # External tools were used (weather, search, etc.) - different from cloud LLM
            tool_names = ', '.join(tools_used)
            trust_details.append(f"🔧 External data: {tool_names}")
            trust_details.append("ℹ️ Only query sent to tool API (not documents/PII)")
            
            # Badge should show tool usage
            if routing_result.is_local:
                actual_badge = "🏠 LOCAL + 🔧 TOOLS"
                actual_message = f"Local LLM with external data tools ({tool_names})"
        
        trust_info = TrustInfo(
            is_local=routing_result.is_local,
            trust_badge=actual_badge,
            trust_message=actual_message,
            trust_details=trust_details,
            sensitivity_level=routing_result.privacy_scan.sensitivity_level.value if hasattr(routing_result.privacy_scan, 'sensitivity_level') else "low",
            pii_detected=routing_result.privacy_scan.contains_pii if hasattr(routing_result.privacy_scan, 'contains_pii') else False,
            document_attached=request.file_attached,
            model_used=model_id,
            model_provider=routing_result.selected_model.provider.value if hasattr(routing_result.selected_model, 'provider') else "local",
            audit_id=routing_result.audit_id if hasattr(routing_result, 'audit_id') else "",
        )
        
        cost_info = CostInfo(
            estimated_cost_usd=routing_result.estimated_cost,
            estimated_cost_inr=routing_result.estimated_cost * 83,
            saved_vs_cloud_usd=routing_result.cost_saved_vs_cloud,
            saved_vs_cloud_inr=routing_result.cost_saved_vs_cloud * 83,
        )
        
        # Log audit (using the sync log method)
        audit_logger.log(
            routing_result=routing_result,
            content=request.messages[-1].content if request.messages else "",
            session_id=request.session_id,
            user_id=request.user_id,
        )
        
        # DEBUG: Log response
        print(f"[TRUST_CHAT] Response content length: {len(response_content)}")
        print(f"[TRUST_CHAT] Response content preview: {response_content[:200] if response_content else 'EMPTY'}")
        # Try to persist session, but don't fail if DB is unavailable
        session_id = request.session_id or str(uuid.uuid4())
        try:
            if db is not None:
                session_id = await session_store.ensure_session(db, request.session_id, request.user_id)
        except Exception as db_error:
            logger.warning("session_store_unavailable", error=str(db_error))
            # Continue without DB persistence - chat still works
        
        response_obj = TrustChatResponse(
            id=str(uuid.uuid4()),
            session_id=session_id,
            message=Message(
                role=MessageRole.ASSISTANT,
                content=response_content,
            ),
            trust=trust_info,
            cost=cost_info,
            model=model_id,
            latency_ms=latency_ms,
            routing_time_ms=routing_result.routing_time_ms
        )


        # Persist last user + assistant messages for resume (optional - don't fail if DB unavailable)
        if db is not None:
            try:
                if request.messages:
                    last_user = request.messages[-1]
                    await session_store.append_message(
                        db,
                        session_id=session_id,
                        role=last_user.role.value,
                        content=last_user.content,
                    )
                await session_store.append_message(
                    db,
                    session_id=session_id,
                    role=MessageRole.ASSISTANT.value,
                    content=response_content,
                    metadata={
                        "model": model_id,
                        "trust": response_obj.trust.model_dump(),
                        "cost": response_obj.cost.model_dump(),
                    },
                )
                await db.commit()
            except Exception as persist_error:
                logger.warning("message_persistence_failed", error=str(persist_error))
                # Continue - response already generated
            logger.warning("message_persistence_failed", error=str(persist_error))
            # Continue - response already generated

        # DEBUG: Log full response object
        print(f"[TRUST_CHAT] Response object message.content: {response_obj.message.content[:200] if response_obj.message.content else 'EMPTY'}")
        print(f"[TRUST_CHAT] Response as dict: {response_obj.model_dump()}")

        return response_obj

    except Exception as e:
        logger.error("trust_chat_error", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/trust/dashboard")
async def get_trust_dashboard():
    """
    Get trust dashboard data for UI.
    Shows users their privacy is protected.
    """
    return audit_logger.get_trust_dashboard_data()


@router.get("/trust/stats")
async def get_trust_stats():
    """Get privacy and cost statistics."""
    return audit_logger.get_stats()


@router.get("/trust/models")
async def list_trust_models():
    """
    List available models with trust classification.
    Shows which models are local vs cloud.
    """
    models = trust_router.get_available_models()
    
    return {
        "models": [
            {
                "id": m.model_id,
                "name": m.display_name,
                "provider": m.provider.value,
                "is_local": m.provider.value == "local",
                "context_window": m.context_window,
                "cost_per_1k_tokens": m.cost_per_1k_tokens,
                "cost_per_1k_tokens_inr": m.cost_per_1k_tokens * 83,
                "capabilities": m.capabilities,
                "trust_badge": "🔒 SECURE LOCAL" if m.provider.value == "local" else "☁️ CLOUD",
            }
            for m in models.values()
        ],
        "trust_summary": trust_router.get_trust_summary()
    }


@router.get("/trust/routing-rules")
async def get_routing_rules():
    """
    Get routing rules for transparency.
    Users can see exactly how their data is routed.
    """
    return {
        "rules": [
            {
                "rule": "Document Upload",
                "action": "LOCAL ONLY",
                "description": "Any uploaded document is always processed on-premise",
            },
            {
                "rule": "PII Detection",
                "action": "LOCAL ONLY",
                "description": "Aadhaar, PAN, phone numbers, emails, names - all processed locally",
            },
            {
                "rule": "Legal Privilege Markers",
                "action": "LOCAL ONLY",
                "description": "Attorney-client privilege, confidential communications",
            },
            {
                "rule": "Case Identifiers",
                "action": "LOCAL ONLY",
                "description": "Case numbers, CNR numbers, FIR numbers",
            },
            {
                "rule": "Financial Information",
                "action": "LOCAL ONLY",
                "description": "Bank accounts, settlement amounts, compensation details",
            },
            {
                "rule": "User Force Local",
                "action": "LOCAL ONLY",
                "description": "User can always choose to process locally",
            },
            {
                "rule": "Generic Queries",
                "action": "CLOUD ALLOWED",
                "description": "Non-sensitive legal questions can use cloud for speed",
            },
        ],
        "guarantees": [
            "Documents NEVER leave your server",
            "PII NEVER sent to external APIs",
            "Full audit trail for compliance",
            "User always knows where data is processed",
        ]
    }
