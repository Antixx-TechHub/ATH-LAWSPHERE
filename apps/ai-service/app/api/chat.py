"""
Chat API endpoints for AI conversations.
"""

from typing import Optional, List, AsyncGenerator
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from enum import Enum
import json
import asyncio

from app.agents.legal_assistant import LegalAssistantAgent
from app.models.llm_router import LLMRouter, ModelType
from app.config import settings
from app.db import get_db
from app.services import session_store
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Message(BaseModel):
    role: MessageRole
    content: str


class ChatRequest(BaseModel):
    """Chat completion request."""
    messages: List[Message]
    model: Optional[ModelType] = None  # Will use DEFAULT_MODEL from config
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    stream: bool = False
    temperature: float = Field(default=0.7, ge=0, le=2)
    max_tokens: Optional[int] = Field(default=4096, ge=1, le=128000)


class ChatResponse(BaseModel):
    """Chat completion response."""
    id: str
    session_id: str
    model: str
    message: Message
    usage: dict
    latency_ms: int


class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@router.post("/completions", response_model=ChatResponse)
async def create_chat_completion(request: ChatRequest, db: AsyncSession = Depends(get_db)):
    """
    Create a chat completion using the selected AI model.
    Supports GPT-4, Claude, Gemini, and other models.
    """
    try:
        # Initialize the LLM router
        llm_router = LLMRouter()
        
        # Use configured default model if none specified
        model_type = request.model or ModelType(settings.DEFAULT_MODEL)
        
        # Get the appropriate model
        llm = llm_router.get_model(model_type)
        
        # Create the legal assistant agent
        agent = LegalAssistantAgent(llm=llm)
        
        # Process the conversation
        import time
        start_time = time.time()
        
        response = await agent.process(
            messages=[{"role": m.role.value, "content": m.content} for m in request.messages],
            session_id=request.session_id,
        )

        # Persist session and messages
        session_id = await session_store.ensure_session(db, response.get("session_id"), request.user_id)
        # Persist latest user message only to avoid duplication
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
            content=response.get("content", ""),
            metadata={"model": model_type.value},
        )
        await db.commit()
        
        latency_ms = int((time.time() - start_time) * 1000)
        
        return ChatResponse(
            id=response.get("id", "chat-" + str(int(time.time()))),
            session_id=session_id,
            model=model_type.value,
            message=Message(
                role=MessageRole.ASSISTANT,
                content=response.get("content", ""),
            ),
            usage={
                "prompt_tokens": response.get("usage", {}).get("prompt_tokens", 0),
                "completion_tokens": response.get("usage", {}).get("completion_tokens", 0),
                "total_tokens": response.get("usage", {}).get("total_tokens", 0),
            },
            latency_ms=latency_ms,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/completions/stream")
async def create_streaming_completion(request: ChatRequest):
    """
    Create a streaming chat completion.
    Returns Server-Sent Events (SSE) for real-time response streaming.
    """
    
    async def generate() -> AsyncGenerator[str, None]:
        try:
            llm_router = LLMRouter()
            llm = llm_router.get_model(request.model)
            agent = LegalAssistantAgent(llm=llm)
            
            async for chunk in agent.stream(
                messages=[{"role": m.role.value, "content": m.content} for m in request.messages],
                session_id=request.session_id,
            ):
                yield f"data: {json.dumps(chunk)}\n\n"
            
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


@router.get("/models")
async def list_models():
    """List available AI models with their capabilities and costs."""
    return {
        "models": [
            {
                "id": "gpt-4",
                "name": "GPT-4",
                "provider": "openai",
                "context_window": 8192,
                "cost_per_1k_input": 0.03,
                "cost_per_1k_output": 0.06,
                "capabilities": ["chat", "analysis", "coding"],
            },
            {
                "id": "gpt-4o",
                "name": "GPT-4o",
                "provider": "openai",
                "context_window": 128000,
                "cost_per_1k_input": 0.005,
                "cost_per_1k_output": 0.015,
                "capabilities": ["chat", "analysis", "coding", "vision"],
            },
            {
                "id": "gpt-5-mini",
                "name": "GPT-5 Mini",
                "provider": "openai",
                "context_window": 128000,
                "cost_per_1k_input": 0.0001,
                "cost_per_1k_output": 0.0004,
                "capabilities": ["chat", "analysis", "legal", "general"],
            },
            {
                "id": "claude-3-opus",
                "name": "Claude 3 Opus",
                "provider": "anthropic",
                "context_window": 200000,
                "cost_per_1k_input": 0.015,
                "cost_per_1k_output": 0.075,
                "capabilities": ["chat", "analysis", "long-context", "coding"],
            },
            {
                "id": "claude-3-sonnet",
                "name": "Claude 3 Sonnet",
                "provider": "anthropic",
                "context_window": 200000,
                "cost_per_1k_input": 0.003,
                "cost_per_1k_output": 0.015,
                "capabilities": ["chat", "analysis", "coding"],
            },
            {
                "id": "gemini-pro",
                "name": "Gemini Pro",
                "provider": "google",
                "context_window": 32000,
                "cost_per_1k_input": 0.00025,
                "cost_per_1k_output": 0.0005,
                "capabilities": ["chat", "analysis", "multimodal"],
            },
            # === OPEN-SOURCE MODELS (Groq - FREE tier!) ===
            {
                "id": "llama-3.1-8b-instant",
                "name": "Llama 3.1 8B Instant",
                "provider": "groq",
                "context_window": 131072,
                "cost_per_1k_input": 0.0,  # FREE!
                "cost_per_1k_output": 0.0,  # FREE!
                "capabilities": ["chat", "legal", "fast", "opensource"],
                "is_opensource": True,
            },
            {
                "id": "llama-3.3-70b-versatile",
                "name": "Llama 3.3 70B Versatile",
                "provider": "groq",
                "context_window": 131072,
                "cost_per_1k_input": 0.0,  # FREE!
                "cost_per_1k_output": 0.0,  # FREE!
                "capabilities": ["chat", "legal", "analysis", "reasoning", "opensource"],
                "is_opensource": True,
            },
            {
                "id": "mixtral-8x7b-32768",
                "name": "Mixtral 8x7B",
                "provider": "groq",
                "context_window": 32768,
                "cost_per_1k_input": 0.0,  # FREE!
                "cost_per_1k_output": 0.0,  # FREE!
                "capabilities": ["chat", "legal", "summarization", "opensource"],
                "is_opensource": True,
            },
        ]
    }
