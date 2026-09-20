"""Tests for Phase 1 & Phase 2: Canonical AI Contract & Unified Processing Pipeline."""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.pipeline import (
    PipelineIncidentRequest,
    PipelineIncidentResponse,
    NearbyIncidentInput,
)
from app.services.pipeline import analyze_incident_pipeline

client = TestClient(app)


def test_unified_pipeline_service_industrial_fire():
    """Test full pipeline service for industrial fire with trapped civilians."""
    request = PipelineIncidentRequest(
        incidentId="INC-2048",
        description="Huge fire at industrial warehouse. People may be trapped. Toxic smoke and chemical fumes spreading.",
        source="CITIZEN",
        location={"latitude": 22.3072, "longitude": 73.1812, "address": "Industrial Area"},
        timestamp="2026-09-20T08:30:00Z",
        context={"nearbyIncidents": [], "affectedPeople": 20},
    )

    response = analyze_incident_pipeline(request)

    assert isinstance(response, PipelineIncidentResponse)
    assert response.classification.type.value in ["INDUSTRIAL_ACCIDENT", "FIRE"]
    assert response.classification.confidence >= 0.70
    assert response.severity.level.value in ["HIGH", "CRITICAL"]
    assert response.severity.confidence >= 0.70
    assert response.priority.level.value == "P1"
    assert "trapped" in response.priority.reason.lower() or "critical" in response.priority.reason.lower() or "emergency" in response.priority.reason.lower()
    assert response.location.latitude == 22.3072
    assert response.location.longitude == 73.1812
    assert response.duplicate.isDuplicate is False
    assert any("fire" in s or "industrial" in s or "trapped" in s for s in response.signals)
    assert response.requiresHumanReview is False


def test_unified_pipeline_endpoint_http():
    """Test POST /api/v1/analyze-incident endpoint via HTTP."""
    payload = {
        "incidentId": "INC-2048",
        "description": "Huge fire at industrial chemical warehouse. Ammonia explosion. 5 workers trapped.",
        "source": "CITIZEN",
        "location": {
            "latitude": 22.3072,
            "longitude": 73.1812,
            "address": "Industrial Area"
        },
        "timestamp": "2026-09-20T08:30:00Z",
        "context": {
            "nearbyIncidents": [],
            "affectedPeople": 20
        }
    }

    res = client.post("/api/v1/analyze-incident", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Validate top-level keys
    assert "classification" in data
    assert "severity" in data
    assert "priority" in data
    assert "location" in data
    assert "duplicate" in data
    assert "signals" in data
    assert "requiresHumanReview" in data

    assert data["classification"]["type"] == "INDUSTRIAL_ACCIDENT"
    assert data["severity"]["level"] == "CRITICAL"
    assert data["priority"]["level"] == "P1"
    assert data["requiresHumanReview"] is False


def test_low_confidence_triggers_human_review():
    """Test that ambiguous/sparse descriptions trigger requiresHumanReview = True."""
    payload = {
        "incidentId": "INC-9999",
        "description": "Something strange happening here.",
        "source": "CITIZEN",
        "location": None,
        "timestamp": "2026-09-20T09:00:00Z",
        "context": {"nearbyIncidents": []}
    }

    res = client.post("/api/v1/analyze-incident", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Sparse description should have low confidence and trigger human review
    assert data["requiresHumanReview"] is True
    assert (data["classification"]["confidence"] < 0.70 or data["severity"]["confidence"] < 0.70)


def test_duplicate_detection_in_pipeline():
    """Test that candidate nearby incidents trigger duplicate detection in pipeline."""
    payload = {
        "incidentId": "INC-2049",
        "description": "Huge fire at industrial warehouse. Smoke spreading rapidly.",
        "source": "CITIZEN",
        "location": {
            "latitude": 22.3072,
            "longitude": 73.1812,
            "address": "Industrial Area"
        },
        "timestamp": "2026-09-20T08:35:00Z",
        "context": {
            "nearbyIncidents": [
                {
                    "incidentId": "INC-2048",
                    "description": "Huge fire at industrial warehouse. Toxic smoke spreading.",
                    "latitude": 22.3072,
                    "longitude": 73.1812,
                    "timestamp": "2026-09-20T08:30:00Z",
                    "source": "CITIZEN"
                }
            ]
        }
    }

    res = client.post("/api/v1/analyze-incident", json=payload)
    assert res.status_code == 200
    data = res.json()

    # Since descriptions and locations are practically identical, duplicate should be detected
    assert data["duplicate"]["isDuplicate"] is True
    assert data["duplicate"]["relatedIncidentId"] == "INC-2048"
    assert data["duplicate"]["similarity"] >= 0.75
