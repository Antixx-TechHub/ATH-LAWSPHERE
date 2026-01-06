"""
Lawsphere AI Service - Main Application Entry Point

FastAPI backend for AI orchestration using LangGraph and LangSmith.
Handles multi-LLM routing, document processing, and vector search.

Version: 1.0.1 - Database reset endpoint active
"""

import os
from dotenv import load_dotenv

# Load environment variables FIRST before any LangChain imports
load_dotenv()

# Disable LangSmith tracing in development (set to "true" in production with valid API key)
os.environ["LANGCHAIN_TRACING_V2"] = os.getenv("LANGCHAIN_TRACING_V2", "false")
os.environ["LANGCHAIN_ENDPOINT"] = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY", "")
os.environ["LANGCHAIN_PROJECT"] = os.getenv("LANGCHAIN_PROJECT", "lawsphere")

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import structlog

from app.config import settings
from app.api import chat, files, search, health
from app.api import trust_chat, sessions
from app.api import knowledge_graph
from app.middleware.logging import LoggingMiddleware
from app.middleware.rate_limit import RateLimitMiddleware
from app.db import init_db

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(settings.LOG_LEVEL),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting Lawsphere AI Service", env=settings.APP_ENV)
    
    # Initialize connections, load models, etc.
    await init_db()
    # await init_redis()
    # await init_embeddings()
    
    yield
    
    # Shutdown
    logger.info("Shutting down Lawsphere AI Service")
    # await close_connections()


# Create FastAPI application
app = FastAPI(
    title="Lawsphere AI Service",
    description="AI orchestration service for legal-tech platform",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

# Mount Prometheus metrics
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)

# Include API routers
app.include_router(health.router, tags=["Health"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(trust_chat.router, prefix="/api/chat", tags=["Trust Chat"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])
app.include_router(files.router, prefix="/api/files", tags=["Files"])
app.include_router(search.router, prefix="/api/search", tags=["Search"])
app.include_router(knowledge_graph.router, prefix="/api/knowledge-graph", tags=["Knowledge Graph"])


@app.get("/_health")
async def railway_health():
    """Railway health check endpoint."""
    return {"status": "healthy"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Lawsphere AI Service",
        "version": "1.0.0",
        "status": "running",
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        workers=1 if settings.DEBUG else settings.WORKERS,
    )
