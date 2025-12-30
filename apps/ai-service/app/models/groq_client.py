"""
Groq Client for Open-Source LLM Inference

Groq provides FREE tier access to:
- Llama 3.1 (8B, 70B)
- Mixtral 8x7B
- Gemma 2

Benefits:
- FREE tier available (no credit card needed)
- Extremely fast inference (LPU technology)
- Open-source models = no data sharing with OpenAI/Anthropic
- Perfect for privacy-sensitive queries
"""

from typing import Optional, List, Dict, Any, AsyncGenerator
import structlog
from groq import Groq, AsyncGroq

from app.config import settings

logger = structlog.get_logger()

# Available Groq models (all open-source!)
GROQ_MODELS = {
    # Llama 3.1 models
    "llama-3.1-8b-instant": {
        "name": "Llama 3.1 8B Instant",
        "context_window": 131072,
        "speed": "fastest",
        "cost": "free",
    },
    "llama-3.1-70b-versatile": {
        "name": "Llama 3.1 70B Versatile", 
        "context_window": 131072,
        "speed": "fast",
        "cost": "free",
    },
    "llama-3.3-70b-versatile": {
        "name": "Llama 3.3 70B Versatile",
        "context_window": 131072,
        "speed": "fast",
        "cost": "free",
    },
    # Mixtral
    "mixtral-8x7b-32768": {
        "name": "Mixtral 8x7B",
        "context_window": 32768,
        "speed": "fast",
        "cost": "free",
    },
    # Gemma
    "gemma2-9b-it": {
        "name": "Gemma 2 9B",
        "context_window": 8192,
        "speed": "fastest",
        "cost": "free",
    },
}


class GroqClient:
    """Client for Groq API - free open-source LLM inference."""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.client: Optional[Groq] = None
        self.async_client: Optional[AsyncGroq] = None
        
        if self.api_key:
            self.client = Groq(api_key=self.api_key)
            self.async_client = AsyncGroq(api_key=self.api_key)
            logger.info("Groq client initialized", models=list(GROQ_MODELS.keys()))
        else:
            logger.warning("Groq API key not set - open-source models unavailable")
    
    @property
    def is_available(self) -> bool:
        """Check if Groq is configured and available."""
        return bool(self.api_key)
    
    def get_available_models(self) -> List[Dict[str, Any]]:
        """Get list of available Groq models."""
        return [
            {"id": model_id, **info}
            for model_id, info in GROQ_MODELS.items()
        ]
    
    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama-3.1-8b-instant",
        temperature: float = 0.7,
        max_tokens: int = 2048,
        stream: bool = False,
    ) -> Dict[str, Any]:
        """
        Generate chat completion using Groq.
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            model: Model ID (default: llama-3.1-8b-instant - fastest & free)
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response
        
        Returns:
            Completion response dict
        """
        if not self.async_client:
            raise ValueError("Groq client not initialized - set GROQ_API_KEY")
        
        # Validate model
        if model not in GROQ_MODELS:
            logger.warning(f"Unknown model {model}, using llama-3.1-8b-instant")
            model = "llama-3.1-8b-instant"
        
        logger.info(
            "Groq chat completion",
            model=model,
            messages_count=len(messages),
            stream=stream,
        )
        
        try:
            response = await self.async_client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=stream,
            )
            
            if stream:
                return response  # Return async generator
            
            # Non-streaming response
            return {
                "id": response.id,
                "model": response.model,
                "content": response.choices[0].message.content,
                "finish_reason": response.choices[0].finish_reason,
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                },
                "provider": "groq",
                "is_opensource": True,
            }
            
        except Exception as e:
            logger.error("Groq API error", error=str(e))
            raise
    
    async def stream_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "llama-3.1-8b-instant",
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """Stream chat completion tokens."""
        if not self.async_client:
            raise ValueError("Groq client not initialized")
        
        stream = await self.async_client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        
        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


# Singleton instance
_groq_client: Optional[GroqClient] = None


def get_groq_client() -> GroqClient:
    """Get or create the Groq client singleton."""
    global _groq_client
    if _groq_client is None:
        _groq_client = GroqClient()
    return _groq_client
