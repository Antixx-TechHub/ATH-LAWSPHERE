"""
Multi-LLM Router for intelligent model selection.
"""

from enum import Enum
from typing import Optional
from langchain_openai import ChatOpenAI
try:
    from langchain_anthropic import ChatAnthropic
    HAS_ANTHROPIC = True
except ImportError:
    HAS_ANTHROPIC = False
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.language_models import BaseChatModel

from app.config import settings


class ModelType(str, Enum):
    GPT4 = "gpt-4"
    GPT4O = "gpt-4o"
    GPT4_TURBO = "gpt-4-turbo"
    GPT5_MINI = "gpt-5-mini"
    CLAUDE_3_OPUS = "claude-3-opus"
    CLAUDE_3_SONNET = "claude-3-sonnet"
    CLAUDE_3_HAIKU = "claude-3-haiku"
    GEMINI_PRO = "gemini-pro"
    GEMINI_FLASH = "gemini-flash"


class ModelConfig:
    """Configuration for each model."""
    
    CONFIGS = {
        ModelType.GPT4: {
            "provider": "openai",
            "model_name": "gpt-4",
            "context_window": 8192,
            "cost_input": 0.03,
            "cost_output": 0.06,
            "max_tokens": 4096,
        },
        ModelType.GPT4O: {
            "provider": "openai",
            "model_name": "gpt-4o",
            "context_window": 128000,
            "cost_input": 0.005,
            "cost_output": 0.015,
            "max_tokens": 4096,
        },
        ModelType.GPT4_TURBO: {
            "provider": "openai",
            "model_name": "gpt-4-turbo",
            "context_window": 128000,
            "cost_input": 0.01,
            "cost_output": 0.03,
            "max_tokens": 4096,
        },
        ModelType.GPT5_MINI: {
            "provider": "openai",
            "model_name": "gpt-5-mini",
            "context_window": 128000,
            "cost_input": 0.0001,
            "cost_output": 0.0004,
            "max_tokens": 4096,
        },
        ModelType.CLAUDE_3_OPUS: {
            "provider": "anthropic",
            "model_name": "claude-3-opus-20240229",
            "context_window": 200000,
            "cost_input": 0.015,
            "cost_output": 0.075,
            "max_tokens": 4096,
        },
        ModelType.CLAUDE_3_SONNET: {
            "provider": "anthropic",
            "model_name": "claude-3-sonnet-20240229",
            "context_window": 200000,
            "cost_input": 0.003,
            "cost_output": 0.015,
            "max_tokens": 4096,
        },
        ModelType.CLAUDE_3_HAIKU: {
            "provider": "anthropic",
            "model_name": "claude-3-haiku-20240307",
            "context_window": 200000,
            "cost_input": 0.00025,
            "cost_output": 0.00125,
            "max_tokens": 4096,
        },
        ModelType.GEMINI_PRO: {
            "provider": "google",
            "model_name": "gemini-2.5-pro",
            "context_window": 1000000,
            "cost_input": 0.00025,
            "cost_output": 0.0005,
            "max_tokens": 8192,
        },
        ModelType.GEMINI_FLASH: {
            "provider": "google",
            "model_name": "gemini-2.0-flash",
            "context_window": 1000000,
            "cost_input": 0.00010,
            "cost_output": 0.0004,
            "max_tokens": 8192,
        },
    }
    
    @classmethod
    def get_config(cls, model_type: ModelType) -> dict:
        return cls.CONFIGS.get(model_type, cls.CONFIGS[ModelType.GPT4O])


class LLMRouter:
    """
    Routes requests to the appropriate LLM based on model selection.
    Implements intelligent routing, fallback chains, and cost optimization.
    """
    
    def __init__(self):
        self._models: dict[ModelType, BaseChatModel] = {}
    
    def get_model(
        self,
        model_type: ModelType,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
    ) -> BaseChatModel:
        """Get or create an LLM instance for the specified model type."""
        
        config = ModelConfig.get_config(model_type)
        max_tokens = max_tokens or config["max_tokens"]
        
        if config["provider"] == "openai":
            return ChatOpenAI(
                model=config["model_name"],
                temperature=temperature,
                max_tokens=max_tokens,
                api_key=settings.OPENAI_API_KEY,
            )
        
        elif config["provider"] == "anthropic":
            if not HAS_ANTHROPIC:
                raise ImportError(
                    "Anthropic support not available. Install langchain-anthropic: "
                    "pip install langchain-anthropic"
                )
            return ChatAnthropic(
                model=config["model_name"],
                temperature=temperature,
                max_tokens=max_tokens,
                api_key=settings.ANTHROPIC_API_KEY,
            )
        
        elif config["provider"] == "google":
            return ChatGoogleGenerativeAI(
                model=config["model_name"],
                temperature=temperature,
                max_output_tokens=max_tokens,
                google_api_key=settings.GOOGLE_API_KEY,
            )
        
        else:
            raise ValueError(f"Unknown provider: {config['provider']}")
    
    def route_by_complexity(
        self,
        query: str,
        context_length: int,
    ) -> ModelType:
        """
        Intelligently route to the best model based on query complexity
        and context length.
        """
        # Simple heuristics for routing
        # In production, this could use a classifier
        
        # Long context -> Claude or GPT-4o
        if context_length > 30000:
            return ModelType.CLAUDE_3_SONNET
        
        # Complex legal analysis
        legal_keywords = ["analyze", "research", "precedent", "statute", "case law"]
        if any(kw in query.lower() for kw in legal_keywords):
            return ModelType.GPT4
        
        # Default to configured model
        default_model = getattr(settings, 'DEFAULT_MODEL', 'gemini-pro')
        return ModelType(default_model)
    
    def get_fallback_chain(self, model_type: ModelType) -> list[ModelType]:
        """Get fallback models if the primary model fails."""
        fallbacks = {
            ModelType.GPT4: [ModelType.GPT4O, ModelType.CLAUDE_3_SONNET],
            ModelType.GPT4O: [ModelType.GPT4, ModelType.CLAUDE_3_SONNET],
            ModelType.CLAUDE_3_OPUS: [ModelType.CLAUDE_3_SONNET, ModelType.GPT4],
            ModelType.CLAUDE_3_SONNET: [ModelType.CLAUDE_3_HAIKU, ModelType.GPT4O],
            ModelType.GEMINI_PRO: [ModelType.GPT4O, ModelType.CLAUDE_3_SONNET],
        }
        return fallbacks.get(model_type, [ModelType.GPT4O])
