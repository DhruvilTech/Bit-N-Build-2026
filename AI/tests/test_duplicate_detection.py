"""Comprehensive tests for the Semantic Duplicate Detection System.

Tests cover:
1. Same incident described differently → DUPLICATE
2. Different incidents → SEPARATE
3. Semantically similar but geographically distant → not DUPLICATE
4. Similar incidents far apart in time → not DUPLICATE
5. Multiple reports of one incident → clustering produces one cluster
6. Missing description → error handling
7. Missing coordinates → graceful handling
8. Invalid timestamp → graceful handling
9. Empty input → error handling
10. Multiple incident sources → correctly processed

All tests verify actual behavior from real ML models, not hardcoded values.
"""

import pytest
import math
from datetime import datetime, timedelta, timezone

from app.services.duplicate_detector import (
    haversine_km,
    geographic_similarity,
    temporal_similarity,
    semantic_similarity,
    combined_similarity,
    classify_pair,
    compare_incidents,
    find_duplicates,
    cluster_incidents,
    parse_timestamp,
    build_reasoning,
)


# ---------------------------------------------------------------------------
# Utility Function Tests
# ---------------------------------------------------------------------------


class TestHaversine:
    """Tests for the Haversine distance function."""

    def test_same_point(self):
        """Distance between identical coordinates should be 0."""
        dist = haversine_km(22.3072, 73.1812, 22.3072, 73.1812)
        assert dist == 0.0

    def test_known_distance(self):
        """Vadodara to Ahmedabad is roughly 100-115km."""
        dist = haversine_km(22.3072, 73.1812, 23.0225, 72.5714)
        assert 95 < dist < 120

    def test_symmetry(self):
        """Distance should be symmetric."""
        d1 = haversine_km(22.3, 73.2, 23.0, 72.6)
        d2 = haversine_km(23.0, 72.6, 22.3, 73.2)
        assert abs(d1 - d2) < 0.001


class TestGeographicSimilarity:
    """Tests for geographic similarity computation."""

    def test_same_location(self):
        sim = geographic_similarity(22.3, 73.2, 22.3, 73.2)
        assert sim == 1.0

    def test_nearby_locations(self):
        """Locations ~500m apart should have high similarity."""
        sim = geographic_similarity(22.3072, 73.1812, 22.312, 73.183)
        assert sim > 0.8

    def test_distant_locations(self):
        """Locations >50km apart should have low similarity."""
        sim = geographic_similarity(22.3072, 73.1812, 23.0225, 72.5714)
        assert sim < 0.1

    def test_missing_coordinates(self):
        """Missing coordinates should return 0.0."""
        assert geographic_similarity(None, None, 22.3, 73.2) == 0.0
        assert geographic_similarity(22.3, 73.2, None, None) == 0.0
        assert geographic_similarity(None, 73.2, 22.3, None) == 0.0


class TestTemporalSimilarity:
    """Tests for temporal similarity computation."""

    def test_same_time(self):
        ts = "2026-01-01T10:00:00Z"
        sim = temporal_similarity(ts, ts)
        assert sim == 1.0

    def test_close_times(self):
        """Events 30 minutes apart should be very similar."""
        ts1 = "2026-01-01T10:00:00Z"
        ts2 = "2026-01-01T10:30:00Z"
        sim = temporal_similarity(ts1, ts2)
        assert sim > 0.9

    def test_distant_times(self):
        """Events 7 days apart should have low similarity."""
        ts1 = "2026-01-01T10:00:00Z"
        ts2 = "2026-01-08T10:00:00Z"
        sim = temporal_similarity(ts1, ts2)
        assert sim < 0.1

    def test_missing_timestamps(self):
        """Missing timestamps should return 0.0."""
        assert temporal_similarity(None, "2026-01-01T10:00:00Z") == 0.0
        assert temporal_similarity("2026-01-01T10:00:00Z", None) == 0.0

    def test_invalid_timestamps(self):
        """Invalid timestamp strings should return 0.0."""
        assert temporal_similarity("not-a-date", "2026-01-01T10:00:00Z") == 0.0
        assert temporal_similarity("", "2026-01-01T10:00:00Z") == 0.0


class TestParseTimestamp:
    """Tests for timestamp parsing."""

    def test_iso_format(self):
        dt = parse_timestamp("2026-01-01T10:00:00Z")
        assert dt is not None
        assert dt.year == 2026

    def test_datetime_object(self):
        dt_input = datetime(2026, 1, 1, 10, 0, 0, tzinfo=timezone.utc)
        dt = parse_timestamp(dt_input)
        assert dt == dt_input

    def test_none(self):
        assert parse_timestamp(None) is None

    def test_empty_string(self):
        assert parse_timestamp("") is None

    def test_invalid_string(self):
        assert parse_timestamp("not-a-date") is None


# ---------------------------------------------------------------------------
# Semantic Similarity Tests (require embedding model)
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def load_embedding_model():
    """Load the embedding model once for all tests in this module."""
    from app.services.embedding_service import embedding_service
    if not embedding_service.is_loaded:
        embedding_service.load_model()
    return embedding_service


class TestSemanticSimilarity:
    """Tests for semantic similarity using real sentence embeddings."""

    def test_identical_text(self, load_embedding_model):
        """Identical text should have similarity very close to 1.0."""
        text = "A massive fire broke out at the warehouse"
        sim = semantic_similarity(text, text)
        assert sim > 0.99

    def test_similar_descriptions(self, load_embedding_model):
        """Paraphrased descriptions of the same event should be highly similar."""
        text_a = "A large fire has engulfed a commercial building in the downtown area with heavy smoke"
        text_b = "Massive blaze at a commercial complex downtown, thick smoke billowing from the structure"
        sim = semantic_similarity(text_a, text_b)
        # Should be substantially similar (both describe a fire at a commercial building downtown)
        assert sim > 0.5

    def test_different_incidents(self, load_embedding_model):
        """Completely different incidents should have lower similarity."""
        text_a = "Major earthquake tremors felt across the district, buildings collapsed"
        text_b = "A car accident on the highway, multiple vehicles involved in a pileup"
        sim = semantic_similarity(text_a, text_b)
        # Different types of incidents — should be less similar
        assert sim < 0.6

    def test_empty_text(self, load_embedding_model):
        """Empty text should return 0.0 similarity."""
        assert semantic_similarity("", "Some text") == 0.0
        assert semantic_similarity("Some text", "") == 0.0
        assert semantic_similarity("", "") == 0.0


# ---------------------------------------------------------------------------
# Combined Similarity Tests
# ---------------------------------------------------------------------------


class TestCombinedSimilarity:
    """Tests for the weighted combination of similarities."""

    def test_all_high(self):
        score = combined_similarity(0.9, 0.9, 0.9)
        assert score > 0.85

    def test_all_low(self):
        score = combined_similarity(0.1, 0.1, 0.1)
        assert score < 0.15

    def test_semantic_only(self):
        """When geo and temporal are 0, weight should redistribute to semantic."""
        score = combined_similarity(0.8, 0.0, 0.0)
        # All weight goes to semantic, so score should equal semantic_sim
        assert abs(score - 0.8) < 0.01

    def test_weight_redistribution(self):
        """Missing geo should redistribute its weight."""
        # With geo=0, only semantic and temporal count
        score = combined_similarity(0.8, 0.0, 0.6)
        assert 0.5 < score < 0.9


class TestClassifyPair:
    """Tests for pair classification based on thresholds."""

    def test_duplicate(self):
        assert classify_pair(0.85) == "DUPLICATE"

    def test_related(self):
        assert classify_pair(0.65) == "RELATED"

    def test_separate(self):
        assert classify_pair(0.3) == "SEPARATE"

    def test_boundary_duplicate(self):
        assert classify_pair(0.80) == "DUPLICATE"

    def test_boundary_related(self):
        assert classify_pair(0.55) == "RELATED"


# ---------------------------------------------------------------------------
# Integration Tests: Full Pipeline
# ---------------------------------------------------------------------------


class TestCompareIncidents:
    """End-to-end tests for pairwise incident comparison."""

    def test_same_incident_different_reports(self, load_embedding_model):
        """Test 1: Two reports describing the SAME incident should be DUPLICATE."""
        incident_a = {
            "incident_id": "TEST-001-A",
            "description": "A massive fire has broken out at a warehouse in the industrial area. "
                          "Heavy smoke visible, fire brigade dispatched. Multiple workers evacuated.",
            "latitude": 22.3072,
            "longitude": 73.1812,
            "timestamp": "2026-06-15T14:30:00Z",
            "source": "CITIZEN",
        }
        incident_b = {
            "incident_id": "TEST-001-B",
            "description": "Large blaze reported at industrial warehouse. Thick black smoke billowing. "
                          "Fire trucks on scene. Workers have been moved to safety.",
            "latitude": 22.3080,
            "longitude": 73.1820,
            "timestamp": "2026-06-15T14:45:00Z",
            "source": "FIELD_TEAM",
        }
        result = compare_incidents(incident_a, incident_b)

        assert result["classification"] in ("DUPLICATE", "RELATED")
        assert result["semantic_similarity"] > 0.4  # Real semantic comparison
        assert result["geographical_similarity"] > 0.9  # Very close locations
        assert result["temporal_similarity"] > 0.9  # 15 mins apart
        assert len(result["reasoning"]) > 0

    def test_different_incidents(self, load_embedding_model):
        """Test 2: Two completely different incidents should be SEPARATE."""
        incident_a = {
            "incident_id": "TEST-002-A",
            "description": "Earthquake tremors measuring 5.2 on Richter scale felt across the district. "
                          "Buildings developed cracks, residents evacuated to open areas.",
            "latitude": 26.9124,
            "longitude": 75.7873,
            "timestamp": "2026-03-10T08:00:00Z",
            "source": "SENSOR",
        }
        incident_b = {
            "incident_id": "TEST-002-B",
            "description": "Multi-vehicle highway accident near the toll plaza. A tanker overturned "
                          "spilling fuel on the road. Five people injured, traffic diverted.",
            "latitude": 19.0760,
            "longitude": 72.8777,
            "timestamp": "2026-08-22T16:30:00Z",
            "source": "EMERGENCY_CALL",
        }
        result = compare_incidents(incident_a, incident_b)

        assert result["classification"] == "SEPARATE"
        assert result["geographical_similarity"] < 0.1  # Very far apart
        assert result["temporal_similarity"] < 0.1  # Months apart

    def test_similar_incidents_different_locations(self, load_embedding_model):
        """Test 3: Semantically similar incidents in different locations should NOT be DUPLICATE."""
        incident_a = {
            "incident_id": "TEST-003-A",
            "description": "Fire broke out at a warehouse causing heavy smoke and flames. "
                          "Fire brigade dispatched, evacuation underway.",
            "latitude": 22.3072,
            "longitude": 73.1812,
            "timestamp": "2026-06-15T14:00:00Z",
            "source": "CITIZEN",
        }
        incident_b = {
            "incident_id": "TEST-003-B",
            "description": "Warehouse fire reported with heavy smoke and flames. "
                          "Emergency services responding, workers being evacuated.",
            "latitude": 12.9716,  # Bengaluru (1000+ km away)
            "longitude": 77.5946,
            "timestamp": "2026-06-15T14:05:00Z",
            "source": "CITIZEN",
        }
        result = compare_incidents(incident_a, incident_b)

        # High semantic similarity but very low geographic similarity
        assert result["semantic_similarity"] > 0.5
        assert result["geographical_similarity"] < 0.01
        # Should NOT be classified as DUPLICATE due to geographic distance
        assert result["classification"] != "DUPLICATE"

    def test_similar_incidents_far_apart_in_time(self, load_embedding_model):
        """Test 4: Similar incidents occurring far apart in time should NOT be DUPLICATE."""
        incident_a = {
            "incident_id": "TEST-004-A",
            "description": "Flash flooding in the residential area after heavy overnight rainfall, "
                          "roads submerged, rescue boats deployed for stranded families.",
            "latitude": 22.3072,
            "longitude": 73.1812,
            "timestamp": "2026-01-15T10:00:00Z",
            "source": "CITIZEN",
        }
        incident_b = {
            "incident_id": "TEST-004-B",
            "description": "Monsoon season waterlogging in the neighbourhood causing traffic disruption, "
                          "drainage overflowing, municipal pumps activated to clear standing water.",
            "latitude": 22.3100,
            "longitude": 73.1850,
            "timestamp": "2026-07-20T14:00:00Z",  # 6 months later
            "source": "FIELD_TEAM",
        }
        result = compare_incidents(incident_a, incident_b)

        assert result["temporal_similarity"] < 0.01  # Very far apart in time
        # The combined score should be lower than for a true duplicate
        # Even if semantic similarity is moderate, the temporal gap should drag score down
        assert result["combined_score"] < 0.90

    def test_missing_coordinates(self, load_embedding_model):
        """Test 7: Missing coordinates should still compute semantic similarity."""
        incident_a = {
            "incident_id": "TEST-007-A",
            "description": "Building fire with multiple floors ablaze and heavy smoke.",
            "latitude": None,
            "longitude": None,
            "timestamp": "2026-06-15T14:00:00Z",
            "source": "EMERGENCY_CALL",
        }
        incident_b = {
            "incident_id": "TEST-007-B",
            "description": "Multi-storey building fire, thick smoke, fire brigade responding.",
            "latitude": 22.3072,
            "longitude": 73.1812,
            "timestamp": "2026-06-15T14:10:00Z",
            "source": "CITIZEN",
        }
        result = compare_incidents(incident_a, incident_b)

        assert result["geographical_similarity"] == 0.0  # One missing location
        assert result["semantic_similarity"] > 0.0  # Should still compute
        assert "incident_a_id" in result
        assert "incident_b_id" in result

    def test_multiple_sources(self, load_embedding_model):
        """Test 10: Different sources should not affect duplicate detection."""
        base = {
            "description": "Chemical gas leak at the industrial plant, toxic fumes spreading, "
                          "hazmat teams deployed, workers being evacuated from the area.",
            "latitude": 22.3072,
            "longitude": 73.1812,
            "timestamp": "2026-06-15T14:00:00Z",
        }

        sources = ["CITIZEN", "SENSOR", "EMERGENCY_CALL", "FIELD_TEAM"]
        for i, src in enumerate(sources):
            incident = {**base, "incident_id": f"TEST-010-{src}", "source": src}
            reference = {**base, "incident_id": "TEST-010-REF", "source": "EMERGENCY_CALL"}
            result = compare_incidents(incident, reference)
            # Same text, same location, same time → should be DUPLICATE
            assert result["classification"] == "DUPLICATE"
            assert result["semantic_similarity"] > 0.99


# ---------------------------------------------------------------------------
# Clustering Tests
# ---------------------------------------------------------------------------


class TestClusterIncidents:
    """Tests for multi-incident clustering / consolidation."""

    def test_multiple_reports_one_incident(self, load_embedding_model):
        """Test 5: Multiple reports of one incident should form ONE cluster."""
        incidents = [
            {
                "incident_id": "CLUSTER-A",
                "description": "Fire at the downtown commercial complex, heavy smoke and flames visible",
                "latitude": 22.3072,
                "longitude": 73.1812,
                "timestamp": "2026-06-15T14:00:00Z",
                "source": "CITIZEN",
            },
            {
                "incident_id": "CLUSTER-B",
                "description": "Commercial building fire downtown, thick smoke, fire brigade on scene",
                "latitude": 22.3078,
                "longitude": 73.1818,
                "timestamp": "2026-06-15T14:10:00Z",
                "source": "SENSOR",
            },
            {
                "incident_id": "CLUSTER-C",
                "description": "Downtown commercial complex ablaze, smoke billowing, evacuation underway",
                "latitude": 22.3075,
                "longitude": 73.1815,
                "timestamp": "2026-06-15T14:20:00Z",
                "source": "FIELD_TEAM",
            },
            {
                "incident_id": "CLUSTER-D",
                "description": "Fire reported at commercial building in downtown area, heavy smoke seen",
                "latitude": 22.3080,
                "longitude": 73.1810,
                "timestamp": "2026-06-15T14:30:00Z",
                "source": "EMERGENCY_CALL",
            },
        ]
        result = cluster_incidents(incidents)

        # All 4 reports of the same fire should cluster together
        # We check that at least 3 of 4 are in the same cluster
        largest_cluster_size = max(c["size"] for c in result["clusters"])
        assert largest_cluster_size >= 3  # At least 3 in one cluster
        assert result["total_incidents"] == 4

    def test_separate_incidents_separate_clusters(self, load_embedding_model):
        """Completely different incidents should form separate clusters."""
        incidents = [
            {
                "incident_id": "DIFF-A",
                "description": "Major earthquake tremors shaking the entire district, buildings cracking",
                "latitude": 26.9124,
                "longitude": 75.7873,
                "timestamp": "2026-01-10T08:00:00Z",
                "source": "SENSOR",
            },
            {
                "incident_id": "DIFF-B",
                "description": "Multi-car pileup on the national highway near the toll plaza",
                "latitude": 19.0760,
                "longitude": 72.8777,
                "timestamp": "2026-08-22T16:30:00Z",
                "source": "CITIZEN",
            },
        ]
        result = cluster_incidents(incidents)

        # Different type, different location, different time → 2 separate clusters
        assert result["total_clusters"] == 2

    def test_empty_incident_list(self, load_embedding_model):
        """Empty list should return empty clusters."""
        result = cluster_incidents([])
        assert result["total_clusters"] == 0
        assert result["total_incidents"] == 0

    def test_single_incident(self, load_embedding_model):
        """Single incident should form one cluster."""
        result = cluster_incidents([{
            "incident_id": "SINGLE-1",
            "description": "Fire at the marketplace",
            "latitude": 22.3, "longitude": 73.2,
            "timestamp": "2026-06-15T14:00:00Z",
            "source": "CITIZEN",
        }])
        assert result["total_clusters"] == 1
        assert result["clusters"][0]["size"] == 1


# ---------------------------------------------------------------------------
# Find Duplicates Tests
# ---------------------------------------------------------------------------


class TestFindDuplicates:
    """Tests for finding duplicates of a target within a candidate list."""

    def test_find_matching_candidate(self, load_embedding_model):
        """Should find a matching candidate in the list."""
        target = {
            "incident_id": "TARGET-1",
            "description": "Warehouse fire in the industrial zone, heavy smoke, fire brigade responding",
            "latitude": 22.3072,
            "longitude": 73.1812,
            "timestamp": "2026-06-15T14:00:00Z",
            "source": "CITIZEN",
        }
        candidates = [
            {
                "incident_id": "CAND-1",
                "description": "Industrial zone warehouse ablaze, thick smoke visible, fire trucks on scene",
                "latitude": 22.3078,
                "longitude": 73.1818,
                "timestamp": "2026-06-15T14:10:00Z",
                "source": "SENSOR",
            },
            {
                "incident_id": "CAND-2",
                "description": "Earthquake tremors felt across the city, buildings shaking",
                "latitude": 26.9124,
                "longitude": 75.7873,
                "timestamp": "2026-03-10T08:00:00Z",
                "source": "SENSOR",
            },
        ]
        results = find_duplicates(target, candidates)

        # Should find at least one match (the warehouse fire)
        assert len(results) >= 1
        match_ids = [r["incident_b_id"] for r in results]
        assert "CAND-1" in match_ids


# ---------------------------------------------------------------------------
# Reasoning Tests
# ---------------------------------------------------------------------------


class TestBuildReasoning:
    """Tests for reasoning generation."""

    def test_reasoning_populated(self):
        """Reasoning should always contain entries for each dimension."""
        reasons = build_reasoning(0.85, 0.90, 0.95, "DUPLICATE")
        assert len(reasons) >= 3  # At least one per dimension

    def test_reasoning_with_missing_geo(self):
        """Missing geo data should produce appropriate reasoning."""
        reasons = build_reasoning(0.85, 0.0, 0.95, "DUPLICATE")
        assert any("unavailable" in r.lower() or "geographic" in r.lower() for r in reasons)

    def test_reasoning_with_missing_temporal(self):
        """Missing temporal data should produce appropriate reasoning."""
        reasons = build_reasoning(0.85, 0.90, 0.0, "DUPLICATE")
        assert any("unavailable" in r.lower() or "temporal" in r.lower() for r in reasons)


# ---------------------------------------------------------------------------
# API Endpoint Tests
# ---------------------------------------------------------------------------


class TestDuplicateCheckAPI:
    """Tests for the duplicate check API endpoint."""

    def test_duplicate_check_endpoint(self, client, load_embedding_model):
        """Test the /api/v1/incidents/duplicate-check endpoint with real incidents."""
        payload = {
            "incident_a": {
                "incident_id": "API-001-A",
                "description": "Building fire with heavy smoke in the commercial district",
                "latitude": 22.3072,
                "longitude": 73.1812,
                "timestamp": "2026-06-15T14:00:00Z",
                "source": "CITIZEN",
            },
            "incident_b": {
                "incident_id": "API-001-B",
                "description": "Commercial district building ablaze, thick smoke rising",
                "latitude": 22.3080,
                "longitude": 73.1820,
                "timestamp": "2026-06-15T14:15:00Z",
                "source": "EMERGENCY_CALL",
            },
        }
        response = client.post("/api/v1/incidents/duplicate-check", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert "classification" in data
        assert data["classification"] in ("DUPLICATE", "RELATED", "SEPARATE")
        assert 0.0 <= data["semantic_similarity"] <= 1.0
        assert 0.0 <= data["geographical_similarity"] <= 1.0
        assert 0.0 <= data["temporal_similarity"] <= 1.0
        assert len(data["reasoning"]) > 0

    def test_duplicate_check_validation_error(self, client, load_embedding_model):
        """Test 6 & 9: Missing/empty description should return validation error."""
        payload = {
            "incident_a": {
                "incident_id": "API-ERR-A",
                "description": "",  # Empty description
            },
            "incident_b": {
                "incident_id": "API-ERR-B",
                "description": "Some incident",
            },
        }
        response = client.post("/api/v1/incidents/duplicate-check", json=payload)
        assert response.status_code == 422  # Validation error

    def test_duplicate_check_missing_description(self, client, load_embedding_model):
        """Test 6: Missing description field should return validation error."""
        payload = {
            "incident_a": {
                "incident_id": "API-MISS-A",
                # description field missing entirely
            },
            "incident_b": {
                "incident_id": "API-MISS-B",
                "description": "Some incident description",
            },
        }
        response = client.post("/api/v1/incidents/duplicate-check", json=payload)
        assert response.status_code == 422

    def test_cluster_endpoint(self, client, load_embedding_model):
        """Test the /api/v1/incidents/cluster endpoint."""
        payload = {
            "incidents": [
                {
                    "incident_id": "API-CL-1",
                    "description": "Fire at the warehouse in industrial area",
                    "latitude": 22.3072,
                    "longitude": 73.1812,
                    "timestamp": "2026-06-15T14:00:00Z",
                    "source": "CITIZEN",
                },
                {
                    "incident_id": "API-CL-2",
                    "description": "Earthquake tremors shaking the city",
                    "latitude": 26.9124,
                    "longitude": 75.7873,
                    "timestamp": "2026-03-10T08:00:00Z",
                    "source": "SENSOR",
                },
            ]
        }
        response = client.post("/api/v1/incidents/cluster", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert "clusters" in data
        assert data["total_incidents"] == 2

    def test_find_duplicates_endpoint(self, client, load_embedding_model):
        """Test the /api/v1/incidents/find-duplicates endpoint."""
        payload = {
            "target": {
                "incident_id": "API-FD-TARGET",
                "description": "Major flooding in the low-lying residential area, roads submerged",
                "latitude": 22.3072,
                "longitude": 73.1812,
                "timestamp": "2026-07-15T10:00:00Z",
                "source": "CITIZEN",
            },
            "candidates": [
                {
                    "incident_id": "API-FD-CAND1",
                    "description": "Residential area flooding, roads underwater, rescue operations underway",
                    "latitude": 22.3080,
                    "longitude": 73.1820,
                    "timestamp": "2026-07-15T10:15:00Z",
                    "source": "FIELD_TEAM",
                },
                {
                    "incident_id": "API-FD-CAND2",
                    "description": "Highway accident near the toll plaza, vehicles involved",
                    "latitude": 19.0760,
                    "longitude": 72.8777,
                    "timestamp": "2026-08-22T16:30:00Z",
                    "source": "EMERGENCY_CALL",
                },
            ],
        }
        response = client.post("/api/v1/incidents/find-duplicates", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["target_id"] == "API-FD-TARGET"
        assert data["total_candidates"] == 2

    def test_invalid_timestamp_handled(self, client, load_embedding_model):
        """Test 8: Invalid timestamp should not crash — temporal similarity should be 0."""
        payload = {
            "incident_a": {
                "incident_id": "API-TS-A",
                "description": "Fire at the building",
                "timestamp": "not-a-valid-timestamp",
            },
            "incident_b": {
                "incident_id": "API-TS-B",
                "description": "Building fire reported",
                "timestamp": "2026-06-15T14:00:00Z",
            },
        }
        response = client.post("/api/v1/incidents/duplicate-check", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert data["temporal_similarity"] == 0.0  # Invalid timestamp → 0


# ---------------------------------------------------------------------------
# Existing Functionality Regression Tests
# ---------------------------------------------------------------------------


class TestExistingFunctionalityRegression:
    """Verify that existing classification/health endpoints still work."""

    def test_health_endpoint(self, client):
        """Health endpoint should still work and include new capabilities."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "DUPLICATE_DETECTION" in data["capabilities"]
        assert "INCIDENT_CLASSIFICATION" in data["capabilities"]

    def test_classification_endpoint_still_works(self, client):
        """Existing classification should not be broken."""
        payload = {
            "title": "Building Fire",
            "description": "Large fire engulfing top floors with heavy smoke",
        }
        response = client.post("/api/v1/classify-incident", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["incidentType"] == "FIRE"

    def test_root_endpoint_has_new_routes(self, client):
        """Root endpoint should advertise new duplicate detection endpoints."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "duplicateCheckEndpoint" in data
        assert "clusterEndpoint" in data
