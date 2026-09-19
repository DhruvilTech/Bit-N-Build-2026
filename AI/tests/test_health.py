"""Tests for health endpoint."""

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "PS9-AI-Service"
    assert "capabilities" in data
    assert "INCIDENT_CLASSIFICATION" in data["capabilities"]


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "/api/v1/classify-incident" in data["classificationEndpoint"]
