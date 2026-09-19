"""API routes for Semantic Duplicate / Related Incident Detection."""

from fastapi import APIRouter, HTTPException, status
from app.schemas.duplicate import (
    DuplicateCheckRequest,
    DuplicateCheckResponse,
    FindDuplicatesRequest,
    FindDuplicatesResponse,
    ClusterRequest,
    ClusterResponse,
)
from app.services.duplicate_detector import (
    compare_incidents,
    find_duplicates,
    cluster_incidents,
)
from app.services.embedding_service import embedding_service
from app.utils.logger import logger


router = APIRouter(prefix="/api/v1", tags=["Duplicate Detection"])


def _incident_to_dict(incident) -> dict:
    """Convert a Pydantic IncidentInput to a plain dict for the detection service."""
    return {
        "incident_id": incident.incident_id,
        "description": incident.description,
        "latitude": incident.latitude,
        "longitude": incident.longitude,
        "timestamp": incident.timestamp,
        "source": incident.source,
    }


@router.post(
    "/incidents/duplicate-check",
    response_model=DuplicateCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Check if two incidents are duplicates, related, or separate",
    description=(
        "Compares two incident reports using semantic NLP embeddings, "
        "geographic proximity (Haversine), and temporal closeness to determine "
        "whether they refer to the same event, are related, or are separate incidents."
    ),
)
def duplicate_check_endpoint(request: DuplicateCheckRequest):
    """Pairwise duplicate detection between two incidents."""
    if not embedding_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding model not loaded. The AI service is still initializing.",
        )

    try:
        result = compare_incidents(
            _incident_to_dict(request.incident_a),
            _incident_to_dict(request.incident_b),
        )
        return DuplicateCheckResponse(**result)
    except Exception as e:
        logger.error(f"Duplicate check failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Duplicate detection engine error: {str(e)}",
        )


@router.post(
    "/incidents/find-duplicates",
    response_model=FindDuplicatesResponse,
    status_code=status.HTTP_200_OK,
    summary="Find duplicate/related incidents for a target against a candidate list",
    description=(
        "Checks a single incident against a list of candidate incidents and returns "
        "all matches classified as DUPLICATE or RELATED, sorted by similarity score."
    ),
)
def find_duplicates_endpoint(request: FindDuplicatesRequest):
    """Find duplicates of a target incident within a candidate list."""
    if not embedding_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding model not loaded. The AI service is still initializing.",
        )

    try:
        target_dict = _incident_to_dict(request.target)
        candidates_dicts = [_incident_to_dict(c) for c in request.candidates]

        matches = find_duplicates(target_dict, candidates_dicts)
        match_responses = [DuplicateCheckResponse(**m) for m in matches]

        return FindDuplicatesResponse(
            target_id=request.target.incident_id,
            matches=match_responses,
            total_candidates=len(request.candidates),
            total_matches=len(match_responses),
        )
    except Exception as e:
        logger.error(f"Find duplicates failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Duplicate search engine error: {str(e)}",
        )


@router.post(
    "/incidents/cluster",
    response_model=ClusterResponse,
    status_code=status.HTTP_200_OK,
    summary="Cluster multiple incidents into groups of related/duplicate reports",
    description=(
        "Analyzes a batch of incidents using semantic, geographic, and temporal similarity "
        "to form clusters of related reports. Identifies a canonical (primary) incident "
        "within each cluster for consolidation."
    ),
)
def cluster_incidents_endpoint(request: ClusterRequest):
    """Cluster/consolidate multiple incident reports."""
    if not embedding_service.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Embedding model not loaded. The AI service is still initializing.",
        )

    try:
        incidents_dicts = [_incident_to_dict(inc) for inc in request.incidents]
        result = cluster_incidents(incidents_dicts, request.cluster_threshold)
        return ClusterResponse(**result)
    except Exception as e:
        logger.error(f"Incident clustering failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clustering engine error: {str(e)}",
        )
