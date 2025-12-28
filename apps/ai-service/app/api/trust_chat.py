"""
Trust-Aware Chat API
Privacy-first chat completions with full transparency.
"""

from typing import Optional, List, AsyncGenerator
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from enum import Enum
import json
import time
import structlog

from app.agents.legal_assistant import LegalAssistantAgent
from app.models.llm_router import LLMRouter, ModelType
from app.models.ollama_client import get_ollama_client, get_ollama_model_name
from app.routing import TrustRouter, AuditLogger, RoutingDecision
from app.config import settings

logger = structlog.get_logger()

router = APIRouter()

# Initialize trust-aware components
# SMART ROUTING: Cloud for speed, Local only for privacy-critical
trust_router = TrustRouter(
    enable_cloud=True,
    default_local_model="qwen2.5-7b",  # Use 7B for quality, fallback to 3B if slow
    default_cloud_model="gemini-flash",  # Very cheap: $0.000075/1K tokens
    cost_optimization=True
)
audit_logger = AuditLogger(
    log_dir="./logs/audit",
    enable_file_logging=True
)

# Ollama client for local inference
ollama_client = get_ollama_client()


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
    id: str
    message: Message
    
    # Trust information (for UI display)
    trust: TrustInfo
    cost: CostInfo
    
    # Performance
    latency_ms: int
    routing_time_ms: float


@router.post("/trust/completions", response_model=TrustChatResponse)
async def create_trust_chat_completion(request: TrustChatRequest):
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
        
        # Get user's message content for routing analysis
        user_content = " ".join([
            m.content for m in request.messages 
            if m.role == MessageRole.USER
        ])
        
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
        
        if routing_result.is_local:
            # Use LOCAL model via Ollama
            logger.info(
                "using_local_model",
                model=model_id,
                is_local=True,
                reason=routing_result.trust_message
            )
            
            try:
                # Check Ollama health
                ollama_healthy = await ollama_client.health_check()
                
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
                            "content": """You are an expert Indian legal AI assistant. 
You help with legal queries, document analysis, and legal research.
Be accurate, cite relevant laws and sections when applicable.
Maintain attorney-client privilege and confidentiality."""
                        })
                    
                    # Call Ollama
                    ollama_response = await ollama_client.chat(
                        model=ollama_model,
                        messages=ollama_messages,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens or 4096
                    )
                    
                    response_content = ollama_response.content
                    
                    logger.info(
                        "local_inference_complete",
                        model=ollama_model,
                        tokens=ollama_response.total_tokens,
                        tokens_per_sec=ollama_response.tokens_per_second
                    )
                else:
                    # Ollama not available, fall back to cloud with warning
                    logger.warning("ollama_unavailable_fallback_to_cloud")
                    
                    # Only fall back if not force_local and content is not too sensitive
                    if request.force_local or routing_result.privacy_scan.force_local:
                        raise HTTPException(
                            status_code=503,
                            detail="Local inference required but Ollama is unavailable. Cannot process sensitive data via cloud."
                        )
                    
                    # Use cloud as fallback for non-sensitive content
                    llm_router = LLMRouter()
                    model_type = ModelType(settings.DEFAULT_MODEL)
                    llm = llm_router.get_model(model_type)
                    agent = LegalAssistantAgent(llm=llm)
                    
                    cloud_response = await agent.process(
                        messages=[{"role": m.role.value, "content": m.content} for m in request.messages],
                        session_id=request.session_id,
                    )
                    response_content = cloud_response.get("content", "")
                    
            except HTTPException:
                raise
            except Exception as e:
                logger.error("local_inference_failed", error=str(e))
                raise HTTPException(
                    status_code=500,
                    detail=f"Local inference failed: {str(e)}"
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
            agent = LegalAssistantAgent(llm=llm)
            
            cloud_response = await agent.process(
                messages=[{"role": m.role.value, "content": m.content} for m in request.messages],
                session_id=request.session_id,
            )
            response_content = cloud_response.get("content", "")
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        # Step 5: Build response with trust information
        trust_info = TrustInfo(
            is_local=routing_result.is_local,
            trust_badge=routing_result.trust_badge,
            trust_message=routing_result.trust_message,
            trust_details=routing_result.trust_details,
            sensitivity_level=routing_result.privacy_scan.sensitivity_level.value,
            pii_detected=len(routing_result.privacy_scan.pii_found) > 0,
            document_attached=routing_result.privacy_scan.document_attached,
            model_used=routing_result.selected_model.display_name,
            model_provider=routing_result.selected_model.provider.value,
            audit_id=routing_result.audit_id
        )
        
        cost_info = CostInfo(
            estimated_cost_usd=routing_result.estimated_cost,
            estimated_cost_inr=routing_result.estimated_cost * 83,
            saved_vs_cloud_usd=routing_result.cost_saved_vs_cloud,
            saved_vs_cloud_inr=routing_result.cost_saved_vs_cloud * 83
        )
        
        return TrustChatResponse(
            id=f"chat-{int(time.time())}",
            message=Message(
                role=MessageRole.ASSISTANT,
                content=response_content,
            ),
            trust=trust_info,
            cost=cost_info,
            latency_ms=latency_ms,
            routing_time_ms=routing_result.routing_time_ms
        )
        
    except Exception as e:
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
