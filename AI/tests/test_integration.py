"""Integration tests for the AI Classification API endpoint."""

def test_classify_incident_integration_success(client):
    payload = {
        "title": "Severe Chemical Leak with Explosion",
        "description": "Boiler explosion at pesticide plant. Toxic ammonia cloud dispersing, 4 operators trapped inside unit.",
        "type": "OTHER",
        "source": "EMERGENCY_CALL",
        "location": {
            "latitude": 19.0760,
            "longitude": 72.8777,
            "address": "Industrial Zone 4, Mumbai",
        },
    }
    response = client.post("/api/v1/classify-incident", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["incidentType"] == "INDUSTRIAL_ACCIDENT"
    assert data["severity"] == "CRITICAL"
    assert data["priority"] == "P1"
    assert 0.0 <= data["confidence"] <= 1.0
    assert data["suggestedCorrection"] is True
    assert data["originalType"] == "OTHER"
    assert "people_trapped" in data["signals"]
    assert "reasoning" in data
    assert "incidentType" in data["reasoning"]
    assert "severity" in data["reasoning"]
    assert "priority" in data["reasoning"]


def test_classify_low_confidence_ambiguous_text(client):
    payload = {
        "title": "Incident reported",
        "description": "Something happened somewhere.",
    }
    response = client.post("/api/v1/classify-incident", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["isLowConfidence"] is True
    assert data["confidence"] < 0.70


def test_validation_error_empty_description(client):
    payload = {
        "title": "Test Fire",
        "description": "   ",
    }
    response = client.post("/api/v1/classify-incident", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert data["success"] is False
    assert "details" in data


def test_classify_detects_vadodara_location(client):
    payload = {
        "title": "Severe Flooding in Downtown Vadodara",
        "description": "On September 18, 2026, continuous heavy rainfall caused the Vishwamitri River to overflow, leading to severe flooding in downtown Vadodara. Several residential areas and commercial buildings were submerged, disrupting transportation and power supply. Emergency services were deployed to evacuate affected residents and provide temporary shelters.",
        "source": "OPERATOR",
    }
    response = client.post("/api/v1/classify-incident", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["incidentType"] == "FLOOD"
    assert "detectedLocation" in data
    loc = data["detectedLocation"]
    assert loc is not None
    assert loc["found"] is True
    assert loc["latitude"] is not None
    assert loc["longitude"] is not None
    # Check that Vadodara coords are resolved (~22.3 lat, ~73.1 lng)
    assert 22.0 <= loc["latitude"] <= 23.0
    assert 73.0 <= loc["longitude"] <= 74.0
    assert "vadodara" in loc["address"].lower()


def test_classify_no_location_returns_not_found(client):
    payload = {
        "title": "Transformer Overheating",
        "description": "Core temperature reached 150C. Coolant pressure dropping rapidly.",
    }
    response = client.post("/api/v1/classify-incident", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "detectedLocation" in data
    assert data["detectedLocation"]["found"] is False

