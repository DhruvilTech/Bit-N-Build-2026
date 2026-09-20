"""Pydantic schemas for Canonical AI ↔ Backend Contract (Phase 1)."""

from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class IncidentTypeEnum(str, Enum):
    FIRE = "FIRE"
    FLOOD = "FLOOD"
    ROAD_ACCIDENT = "ROAD_ACCIDENT"
    INDUSTRIAL_ACCIDENT = "INDUSTRIAL_ACCIDENT"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"
    EARTHQUAKE = "EARTHQUAKE"
    OTHER = "OTHER"


class SeverityLevelEnum(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PriorityLevelEnum(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class PipelineLocationInput(BaseModel):
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    address: Optional[str] = Field(None, max_length=500)


class NearbyIncidentInput(BaseModel):
    incidentId: Optional[str] = None
    incident_id: Optional[str] = None
    title: Optional[str] = None
    description: str = Field(..., min_length=1)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    timestamp: Optional[str] = None
    source: Optional[str] = None
    type: Optional[str] = None
    location: Optional[Dict[str, Any]] = None

    def get_id(self) -> str:
        return self.incidentId or self.incident_id or "UNKNOWN"

    def get_lat(self) -> Optional[float]:
        if self.latitude is not None:
            return self.latitude
        if self.location and "latitude" in self.location:
            return self.location.get("latitude")
        return None

    def get_lng(self) -> Optional[float]:
        if self.longitude is not None:
            return self.longitude
        if self.location and "longitude" in self.location:
            return self.location.get("longitude")
        return None


class PipelineContextInput(BaseModel):
    nearbyIncidents: List[NearbyIncidentInput] = Field(default_factory=list)
    affectedPeople: Optional[int] = Field(None, ge=0)


class PipelineIncidentRequest(BaseModel):
    incidentId: str = Field(..., min_length=1, description="Unique incident identifier")
    description: str = Field(..., min_length=1, max_length=10000, description="Incident description narrative")
    title: Optional[str] = Field(None, description="Optional incident title")
    source: Optional[str] = Field("CITIZEN", description="Report source (CITIZEN, SENSOR, EMERGENCY_CALL, etc.)")
    location: Optional[PipelineLocationInput] = Field(None, description="Reported coordinates and address")
    timestamp: Optional[str] = Field(None, description="ISO timestamp of report")
    context: Optional[PipelineContextInput] = Field(default_factory=PipelineContextInput, description="Operational context")

    @field_validator("description")
    @classmethod
    def strip_description(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Description cannot be empty or whitespace only")
        return stripped


# ---------------------------------------------------------------------------
# Output Schemas (Canonical AI -> Backend Response)
# ---------------------------------------------------------------------------


class ClassificationOutput(BaseModel):
    type: IncidentTypeEnum = Field(..., description="Operational category")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score 0.0 - 1.0")


class SeverityOutput(BaseModel):
    level: SeverityLevelEnum = Field(..., description="Severity rating")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Calibrated severity confidence 0.0 - 1.0")


class PriorityOutput(BaseModel):
    level: PriorityLevelEnum = Field(..., description="Dispatch priority rating")
    reason: str = Field(..., description="Operational reason or justification")


class LocationOutput(BaseModel):
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0, description="Latitude")
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0, description="Longitude")
    address: Optional[str] = Field(None, description="Resolved or reported address")


class DuplicateOutput(BaseModel):
    isDuplicate: bool = Field(False, description="Whether this report duplicates an existing incident")
    similarity: float = Field(0.0, ge=0.0, le=1.0, description="Multi-factor similarity score 0.0 - 1.0")
    relatedIncidentId: Optional[str] = Field(None, description="Primary incident ID if duplicate/related")


class PipelineIncidentResponse(BaseModel):
    classification: ClassificationOutput
    severity: SeverityOutput
    priority: PriorityOutput
    location: LocationOutput
    duplicate: DuplicateOutput
    signals: List[str] = Field(default_factory=list, description="Extracted domain keywords/tactical signals")
    requiresHumanReview: bool = Field(..., description="Flagged if confidence < threshold or ambiguous")
