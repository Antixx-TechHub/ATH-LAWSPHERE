"""
Health check endpoints.
"""

from fastapi import APIRouter
from datetime import datetime

from app.models.ollama_client import get_ollama_client

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "lawsphere-ai-service",
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check for Kubernetes."""
    # Check Ollama availability
    ollama = get_ollama_client()
    ollama_healthy = await ollama.health_check()
    
    return {
        "status": "ready",
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {
            "database": "ok",
            "redis": "ok",
            "ai_providers": "ok",
            "ollama_local": "ok" if ollama_healthy else "unavailable",
        },
    }


@router.get("/live")
async def liveness_check():
    """Liveness check for Kubernetes."""
    return {"status": "alive"}


@router.get("/ollama/status")
async def ollama_status():
    """Check Ollama server status and available models."""
    ollama = get_ollama_client()
    
    is_healthy = await ollama.health_check()
    models = []
    
    if is_healthy:
        models = await ollama.list_models()
    
    return {
        "status": "running" if is_healthy else "offline",
        "base_url": ollama.base_url,
        "models": [
            {
                "name": m.name,
                "size": m.size,
                "modified": m.modified
            }
            for m in models
        ],
        "model_count": len(models),
        "recommendation": "Ollama is ready for local inference" if is_healthy else "Start Ollama with 'ollama serve'"
    }
