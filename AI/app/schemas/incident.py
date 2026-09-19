"""Pydantic schemas for Incident Classification Request & Response."""

from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field, field_validator


class IncidentCategory(str, Enum):
    FIRE = "FIRE"
    FLOOD = "FLOOD"
    ROAD_ACCIDENT = "ROAD_ACCIDENT"
    INDUSTRIAL_ACCIDENT = "INDUSTRIAL_ACCIDENT"
    MEDICAL_EMERGENCY = "MEDICAL_EMERGENCY"
    EARTHQUAKE = "EARTHQUAKE"
    OTHER = "OTHER"


class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class PriorityLevel(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class LocationInput(BaseModel):
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    address: Optional[str] = Field(None, max_length=500)


class IncidentClassifyRequest(BaseModel):
    incidentId: Optional[str] = Field(None, description="Optional incident identifier")
    title: str = Field(..., min_length=1, max_length=300, description="Incident title or summary")
    description: str = Field(..., min_length=1, max_length=5000, description="Detailed incident narrative")
    type: Optional[str] = Field(None, description="Reported type from user/caller if available")
    source: Optional[str] = Field("EMERGENCY_CALL", description="Reporting source (e.g. SENSOR, CITIZEN, EMERGENCY_CALL)")
    location: Optional[LocationInput] = Field(None, description="Geographic location details")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Arbitrary reporter metadata")

    @field_validator("title", "description")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty or solely whitespace")
        return stripped


class ReasoningDetail(BaseModel):
    incidentType: str = Field(..., description="Explanation for assigned category")
    severity: str = Field(..., description="Evidence-backed justification for severity level")
    priority: str = Field(..., description="Operational justification for dispatch priority")


class DetectedLocation(BaseModel):
    found: bool = Field(False, description="Whether a location was identified in the narrative")
    address: Optional[str] = Field(None, description="Resolved street address or locality name")
    latitude: Optional[float] = Field(None, description="Resolved latitude coordinate")
    longitude: Optional[float] = Field(None, description="Resolved longitude coordinate")
    rawMention: Optional[str] = Field(None, description="Original text snippet identifying location")
    confidence: Optional[float] = Field(None, description="Confidence in location extraction")


class IncidentClassifyResponse(BaseModel):
    incidentType: IncidentCategory = Field(..., description="Classified incident category")
    severity: SeverityLevel = Field(..., description="Evaluated severity rating")
    priority: PriorityLevel = Field(..., description="Dispatch priority rating")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Calibrated confidence score (0.00 - 1.00)")
    signals: List[str] = Field(default_factory=list, description="Extracted domain keywords and tactical signals")
    reasoning: ReasoningDetail = Field(..., description="Machine-readable reasoning breakdown")
    detectedLocation: Optional[DetectedLocation] = Field(None, description="AI-extracted geospatial location from incident narrative")
    suggestedCorrection: bool = Field(False, description="True if AI corrected the user-reported incident type")
    originalType: Optional[str] = Field(None, description="Reported type prior to AI correction")
    isLowConfidence: bool = Field(False, description="True if confidence is below operator review threshold (< 0.70)")
    model: str = Field("emergency-classifier-v1", description="Model identifier")
    version: str = Field("1.0", description="Model engine version")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Timestamp of inference")

