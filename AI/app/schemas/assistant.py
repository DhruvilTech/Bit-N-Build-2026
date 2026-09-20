"""Pydantic schemas for AI Emergency Summary and Command Assistant."""

from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class IncidentContext(BaseModel):
    id: str
    title: str
    type: Optional[str] = "OTHER"
    severity: Optional[str] = "MEDIUM"
    priority: Optional[str] = "P2"
    status: Optional[str] = "NEW"
    address: Optional[str] = "Unknown"
    delayDetected: Optional[bool] = False
    delayMinutes: Optional[int] = 0
    reportCount: Optional[int] = 1


class ResponseContext(BaseModel):
    assignedTeamsCount: int = 0
    assignedTeams: List[Dict[str, Any]] = Field(default_factory=list)


class ResourceContext(BaseModel):
    availableAmbulancesCount: int = 0
    hospitals: List[Dict[str, Any]] = Field(default_factory=list)


class IncidentSummaryRequest(BaseModel):
    incident: IncidentContext
    response: ResponseContext
    resources: ResourceContext
    timeline: List[Dict[str, Any]] = Field(default_factory=list)
    escalations: List[Dict[str, Any]] = Field(default_factory=list)


class IncidentSummaryResponse(BaseModel):
    situation: str
    currentResponse: List[str]
    resourceStatus: List[str]
    risks: List[str]
    delays: List[str]
    recommendedActions: List[str]
    generatedAt: str


class ChatCommandRequest(BaseModel):
    message: str
    intent: Optional[str] = "GENERAL_OPERATIONAL_QUERY"
    context: Optional[Any] = None
    history: Optional[List[Dict[str, Any]]] = None


class ChatCommandResponse(BaseModel):
    answer: str
    intent: str
    generatedAt: str
