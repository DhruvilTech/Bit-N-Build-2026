"""Pydantic schemas for Duplicate Detection Request & Response models."""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Incident Input for Duplicate Detection
# ---------------------------------------------------------------------------


class IncidentInput(BaseModel):
    """A single incident for duplicate detection analysis."""

    incident_id: str = Field(
        default="unknown",
        description="Unique identifier for the incident",
    )
    description: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Textual description of the incident",
    )
    latitude: Optional[float] = Field(
        None,
        ge=-90.0,
        le=90.0,
        description="Latitude coordinate of the incident location",
    )
    longitude: Optional[float] = Field(
        None,
        ge=-180.0,
        le=180.0,
        description="Longitude coordinate of the incident location",
    )
    timestamp: Optional[str] = Field(
        None,
        description="ISO 8601 timestamp of the incident report",
    )
    source: Optional[str] = Field(
        "EMERGENCY_CALL",
        description="Reporting source (CITIZEN, SENSOR, EMERGENCY_CALL, FIELD_TEAM, etc.)",
    )

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Description cannot be empty or solely whitespace")
        return stripped


# ---------------------------------------------------------------------------
# Pairwise Duplicate Check
# ---------------------------------------------------------------------------


class DuplicateCheckRequest(BaseModel):
    """Request to check if two incidents are duplicates/related."""

    incident_a: IncidentInput = Field(
        ..., description="First incident to compare"
    )
    incident_b: IncidentInput = Field(
        ..., description="Second incident to compare"
    )


class DuplicateCheckResponse(BaseModel):
    """Result of pairwise duplicate detection analysis."""

    incident_a_id: str = Field(..., description="ID of the first incident")
    incident_b_id: str = Field(..., description="ID of the second incident")
    classification: str = Field(
        ...,
        description="Relationship classification: DUPLICATE, RELATED, or SEPARATE",
    )
    probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Confidence probability of the classification",
    )
    semantic_similarity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Cosine similarity between sentence embeddings",
    )
    geographical_similarity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Geographic proximity score (Haversine + exponential decay)",
    )
    temporal_similarity: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Temporal closeness score (exponential decay)",
    )
    combined_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Weighted combination of all similarity dimensions",
    )
    reasoning: List[str] = Field(
        default_factory=list,
        description="Human-readable reasoning for the classification",
    )
    model_used: str = Field(
        ...,
        description="Whether trained_classifier or threshold_based was used",
    )


# ---------------------------------------------------------------------------
# Find Duplicates (one vs many)
# ---------------------------------------------------------------------------


class FindDuplicatesRequest(BaseModel):
    """Request to check one incident against a list of candidates."""

    target: IncidentInput = Field(
        ..., description="The incident to check for duplicates"
    )
    candidates: List[IncidentInput] = Field(
        ...,
        min_length=1,
        max_length=500,
        description="List of candidate incidents to compare against",
    )


class FindDuplicatesResponse(BaseModel):
    """Response containing matched duplicate/related incidents."""

    target_id: str = Field(..., description="ID of the target incident")
    matches: List[DuplicateCheckResponse] = Field(
        default_factory=list,
        description="Matched incidents (DUPLICATE or RELATED only), sorted by score",
    )
    total_candidates: int = Field(
        ..., description="Total number of candidates checked"
    )
    total_matches: int = Field(
        ..., description="Number of DUPLICATE/RELATED matches found"
    )


# ---------------------------------------------------------------------------
# Incident Clustering / Consolidation
# ---------------------------------------------------------------------------


class ClusterRequest(BaseModel):
    """Request to cluster multiple incidents into groups."""

    incidents: List[IncidentInput] = Field(
        ...,
        min_length=1,
        max_length=500,
        description="List of incidents to cluster",
    )
    cluster_threshold: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Override combined similarity threshold for clustering",
    )


class PairwiseSimilarity(BaseModel):
    """Pairwise similarity within a cluster."""

    incident_a_id: str
    incident_b_id: str
    semantic_similarity: float
    geographical_similarity: float
    temporal_similarity: float
    combined_score: float
    classification: str


class IncidentCluster(BaseModel):
    """A cluster of related/duplicate incidents."""

    cluster_id: int = Field(..., description="Cluster identifier")
    canonical_incident_id: str = Field(
        ..., description="ID of the canonical (earliest/primary) incident in the cluster"
    )
    incident_ids: List[str] = Field(
        default_factory=list,
        description="IDs of all incidents in this cluster",
    )
    size: int = Field(..., description="Number of incidents in this cluster")
    pairwise_similarities: List[PairwiseSimilarity] = Field(
        default_factory=list,
        description="Pairwise similarities within the cluster",
    )


class ClusterResponse(BaseModel):
    """Response containing incident clusters."""

    clusters: List[IncidentCluster] = Field(
        default_factory=list,
        description="List of identified incident clusters",
    )
    total_clusters: int = Field(
        ..., description="Total number of clusters formed"
    )
    total_incidents: int = Field(
        ..., description="Total number of incidents processed"
    )
