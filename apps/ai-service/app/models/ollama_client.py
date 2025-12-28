"""
Ollama Client Module
Handles communication with local Ollama server for privacy-first inference.
"""

import os
import httpx
import json
import asyncio
from typing import Optional, AsyncGenerator, Dict, Any, List
from dataclasses import dataclass
from datetime import datetime
import structlog

logger = structlog.get_logger()

# Ollama base URL from environment (for Docker support)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


@dataclass
class OllamaModel:
    """Available Ollama model info"""
    name: str
    size: str
    modified: str
    digest: str


@dataclass
class OllamaResponse:
    """Response from Ollama inference"""
    model: str
    content: str
    done: bool
    total_duration_ns: int = 0
    load_duration_ns: int = 0
    prompt_eval_count: int = 0
    eval_count: int = 0
    eval_duration_ns: int = 0
    
    @property
    def total_tokens(self) -> int:
        return self.prompt_eval_count + self.eval_count
    
    @property
    def tokens_per_second(self) -> float:
        if self.eval_duration_ns > 0:
            return self.eval_count / (self.eval_duration_ns / 1e9)
        return 0.0


class OllamaClient:
    """
    Async client for Ollama local inference.
    
    Features:
    - Connection health checking
    - Model availability verification
    - Streaming and non-streaming inference
    - Automatic model loading
    """
    
    def __init__(
        self,
        base_url: str = None,
        timeout: float = 300.0  # 5 min timeout for CPU inference
    ):
        self.base_url = (base_url or OLLAMA_BASE_URL).rstrip("/")
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        logger.info("ollama_client_init", base_url=self.base_url)
        
    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout, connect=10.0)
            )
        return self._client
    
    async def close(self):
        """Close the HTTP client"""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
    
    async def health_check(self) -> bool:
        """Check if Ollama server is running"""
        try:
            client = await self._get_client()
            response = await client.get("/")
            return response.status_code == 200
        except Exception as e:
            logger.warning("ollama_health_check_failed", error=str(e))
            return False
    
    async def list_models(self) -> List[OllamaModel]:
        """List all available models"""
        try:
            client = await self._get_client()
            response = await client.get("/api/tags")
            response.raise_for_status()
            data = response.json()
            
            models = []
            for m in data.get("models", []):
                models.append(OllamaModel(
                    name=m.get("name", ""),
                    size=self._format_size(m.get("size", 0)),
                    modified=m.get("modified_at", ""),
                    digest=m.get("digest", "")[:12]
                ))
            return models
        except Exception as e:
            logger.error("ollama_list_models_failed", error=str(e))
            return []
    
    async def is_model_available(self, model_name: str) -> bool:
        """Check if a specific model is available"""
        models = await self.list_models()
        # Check both exact match and prefix match (e.g., "qwen2.5:7b" matches "qwen2.5")
        return any(
            m.name == model_name or 
            m.name.startswith(model_name.split(":")[0])
            for m in models
        )
    
    async def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama registry"""
        try:
            client = await self._get_client()
            response = await client.post(
                "/api/pull",
                json={"name": model_name},
                timeout=httpx.Timeout(600.0)  # 10 min for large models
            )
            response.raise_for_status()
            return True
        except Exception as e:
            logger.error("ollama_pull_model_failed", model=model_name, error=str(e))
            return False
    
    async def generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        stream: bool = False
    ) -> OllamaResponse:
        """
        Generate completion using Ollama.
        
        Args:
            model: Model name (e.g., "qwen2.5:7b", "llama3.1:8b")
            prompt: User prompt
            system: System prompt
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            stream: Whether to stream response
        
        Returns:
            OllamaResponse with generated content
        """
        try:
            client = await self._get_client()
            
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False,  # Non-streaming for now
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                }
            }
            
            if system:
                payload["system"] = system
            
            logger.info("ollama_generate_start", model=model, prompt_length=len(prompt))
            
            response = await client.post("/api/generate", json=payload)
            response.raise_for_status()
            data = response.json()
            
            result = OllamaResponse(
                model=data.get("model", model),
                content=data.get("response", ""),
                done=data.get("done", True),
                total_duration_ns=data.get("total_duration", 0),
                load_duration_ns=data.get("load_duration", 0),
                prompt_eval_count=data.get("prompt_eval_count", 0),
                eval_count=data.get("eval_count", 0),
                eval_duration_ns=data.get("eval_duration", 0)
            )
            
            logger.info(
                "ollama_generate_complete",
                model=model,
                tokens=result.total_tokens,
                tokens_per_sec=round(result.tokens_per_second, 2),
                duration_ms=result.total_duration_ns / 1e6
            )
            
            return result
            
        except httpx.TimeoutException:
            logger.error("ollama_generate_timeout", model=model)
            raise TimeoutError(f"Ollama request timed out for model {model}")
        except Exception as e:
            logger.error("ollama_generate_failed", model=model, error=str(e))
            raise
    
    async def chat(
        self,
        model: str,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> OllamaResponse:
        """
        Chat completion using Ollama's chat API.
        
        Args:
            model: Model name
            messages: List of {"role": "user/assistant/system", "content": "..."}
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
        
        Returns:
            OllamaResponse with generated content
        """
        try:
            client = await self._get_client()
            
            payload = {
                "model": model,
                "messages": messages,
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                }
            }
            
            logger.info("ollama_chat_start", model=model, num_messages=len(messages))
            
            response = await client.post("/api/chat", json=payload)
            response.raise_for_status()
            data = response.json()
            
            message = data.get("message", {})
            
            result = OllamaResponse(
                model=data.get("model", model),
                content=message.get("content", ""),
                done=data.get("done", True),
                total_duration_ns=data.get("total_duration", 0),
                load_duration_ns=data.get("load_duration", 0),
                prompt_eval_count=data.get("prompt_eval_count", 0),
                eval_count=data.get("eval_count", 0),
                eval_duration_ns=data.get("eval_duration", 0)
            )
            
            logger.info(
                "ollama_chat_complete",
                model=model,
                tokens=result.total_tokens,
                tokens_per_sec=round(result.tokens_per_second, 2)
            )
            
            return result
            
        except Exception as e:
            logger.error("ollama_chat_failed", model=model, error=str(e))
            raise
    
    async def stream_generate(
        self,
        model: str,
        prompt: str,
        system: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> AsyncGenerator[str, None]:
        """
        Stream generate completion.
        
        Yields:
            String chunks as they are generated
        """
        try:
            client = await self._get_client()
            
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                }
            }
            
            if system:
                payload["system"] = system
            
            async with client.stream("POST", "/api/generate", json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        try:
                            data = json.loads(line)
                            if "response" in data:
                                yield data["response"]
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue
                            
        except Exception as e:
            logger.error("ollama_stream_failed", model=model, error=str(e))
            raise
    
    def _format_size(self, size_bytes: int) -> str:
        """Format bytes to human readable size"""
        for unit in ["B", "KB", "MB", "GB"]:
            if size_bytes < 1024:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024
        return f"{size_bytes:.1f} TB"


# Singleton instance
_ollama_client: Optional[OllamaClient] = None


def get_ollama_client() -> OllamaClient:
    """Get the singleton Ollama client"""
    global _ollama_client
    if _ollama_client is None:
        _ollama_client = OllamaClient()
    return _ollama_client


# Model name mappings (our names -> Ollama names)
MODEL_MAPPING = {
    "qwen2.5-3b": "qwen2.5:3b",     # Fast for CPU
    "qwen2.5-7b": "qwen2.5:7b",     # Good balance
    "qwen2.5-14b": "qwen2.5:14b",   # High quality
    "qwen2.5-32b": "qwen2.5:32b",   # Best quality (needs GPU)
    "llama3.1-8b": "llama3.1:8b",   # Alternative
    "llama3.1-70b": "llama3.1:70b", # Best Llama (needs GPU)
    # Fallback to same name if not in mapping
}


def get_ollama_model_name(model_id: str) -> str:
    """Convert our model ID to Ollama model name"""
    return MODEL_MAPPING.get(model_id, model_id)
