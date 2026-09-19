"""Incident Classification API endpoints."""

from fastapi import APIRouter, HTTPException, status
from app.schemas.incident import (
    IncidentClassifyRequest,
    IncidentClassifyResponse,
)
from app.services.inference import run_incident_classification
from app.utils.logger import logger

router = APIRouter(prefix="/api/v1", tags=["Classification"])


@router.post(
    "/classify-incident",
    response_model=IncidentClassifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Classify emergency incident narrative into type, severity, priority and explainable reasoning",
)
def classify_incident_endpoint(request: IncidentClassifyRequest):
    """Processes an incoming incident report and produces structured triage assessment."""
    try:
        return run_incident_classification(request)
    except Exception as e:
        logger.error(f"Error during incident classification: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference engine failure: {str(e)}",
        )


# Backward compatibility alias
@router.post(
    "/classify",
    response_model=IncidentClassifyResponse,
    status_code=status.HTTP_200_OK,
    include_in_schema=False,
)
def classify_alias(request: IncidentClassifyRequest):
    return classify_incident_endpoint(request)
