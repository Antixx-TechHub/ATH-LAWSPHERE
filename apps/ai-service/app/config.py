"""
Application configuration using Pydantic Settings.
"""

from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",  # Ignore extra environment variables
    )
    
    # Application
    APP_NAME: str = "lawsphere-ai-service"
    APP_ENV: str = "development"  # Set to "production" in Railway
    DEBUG: bool = False  # Override in development with DEBUG=true
    LOG_LEVEL: str = "INFO"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4
    
    # CORS - Production domains
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "https://ath-lawsphere-production.up.railway.app",
        "https://*.railway.app",
        "https://*.up.railway.app",
    ]
    
    # Database (set via DATABASE_URL env var in production)
    DATABASE_URL: str = "postgresql+asyncpg://lawsphere:lawsphere_secret@localhost:5433/lawsphere"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    
    # S3 Storage
    S3_BUCKET: str = "lawsphere-files"
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: str = ""
    S3_SECRET_KEY: str = ""
    S3_ENDPOINT: str = ""
    
    # AI Providers (set via environment variables)
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GROQ_API_KEY: str = ""  # Free tier available at groq.com - hosts Llama 3, Mixtral, Gemma
    TOGETHER_API_KEY: str = ""  # Alternative open-source model provider
    
    # Local LLM (Ollama) - for local development only
    OLLAMA_ENABLED: bool = False
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2"
    
    # Open-source model provider for production (Groq is free & fast)
    OPENSOURCE_PROVIDER: str = "groq"  # "groq", "together", or "ollama"
    OPENSOURCE_MODEL: str = "llama-3.1-8b-instant"  # Fast & free on Groq
    
    # Default Model (gpt-5-mini, gpt-4o, gemini-flash, gpt-4o, claude-3-sonnet, etc.)
    # If OLLAMA_ENABLED=true, will use OLLAMA_MODEL instead
    DEFAULT_MODEL: str = "gpt-5-mini"
    
    # LangSmith
    LANGCHAIN_TRACING_V2: bool = True
    LANGCHAIN_ENDPOINT: str = "https://api.smith.langchain.com"
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_PROJECT: str = "lawsphere"
    
    # Embeddings
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_PERIOD: int = 60
    
    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


settings = Settings()
