"""Health and readiness check endpoints."""

from fastapi import APIRouter
from app.config import settings
from app.services.embedding_service import embedding_service
from datetime import datetime, timezone

router = APIRouter(tags=["Health"])

START_TIME = datetime.now(timezone.utc)


@router.get("/health")
def get_health():
    """Health check verifying AI service status, version, and supported capabilities."""
    uptime_seconds = (datetime.now(timezone.utc) - START_TIME).total_seconds()
    return {
        "status": "healthy",
        "service": settings.AI_SERVICE_NAME,
        "version": settings.AI_SERVICE_VERSION,
        "environment": settings.ENVIRONMENT,
        "model": settings.AI_MODEL_NAME,
        "embeddingModel": {
            "name": embedding_service.model_name if embedding_service.is_loaded else settings.EMBEDDING_MODEL_NAME,
            "loaded": embedding_service.is_loaded,
            "embeddingDim": embedding_service.embedding_dim if embedding_service.is_loaded else None,
        },
        "uptimeSeconds": round(uptime_seconds, 2),
        "capabilities": [
            "INCIDENT_CLASSIFICATION",
            "SEVERITY_EVALUATION",
            "OPERATIONAL_PRIORITY",
            "SAFETY_ESCALATION",
            "CALIBRATED_CONFIDENCE",
            "EXPLAINABLE_REASONING",
            "DUPLICATE_DETECTION",
            "INCIDENT_CLUSTERING",
        ],
    }
