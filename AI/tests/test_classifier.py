"""Unit tests for incident category classification."""

from app.schemas.incident import IncidentCategory
from app.services.preprocessing import preprocess_incident
from app.services.classifier import classify_incident


def test_classify_fire():
    prep = preprocess_incident("Commercial Building Fire", "Blaze engulfing top floors of office tower with heavy smoke.")
    res = classify_incident(prep)
    assert res.category == IncidentCategory.FIRE


def test_classify_flood():
    prep = preprocess_incident("River Overflowing", "Flash floods inundating residential lowlands, houses submerged.")
    res = classify_incident(prep)
    assert res.category == IncidentCategory.FLOOD


def test_classify_road_accident():
    prep = preprocess_incident("Highway Pileup", "Multi-car collision on expressway, overturned bus blocking all lanes.")
    res = classify_incident(prep)
    assert res.category == IncidentCategory.ROAD_ACCIDENT


def test_classify_industrial_accident():
    prep = preprocess_incident("Chemical Factory Blast", "Boiler exploded at agrochemical plant, toxic ammonia leak.")
    res = classify_incident(prep)
    assert res.category == IncidentCategory.INDUSTRIAL_ACCIDENT


def test_classify_medical_emergency():
    prep = preprocess_incident("Elderly Person Collapsed", "Elderly male suffered cardiac arrest, unresponsive, CPR in progress.")
    res = classify_incident(prep)
    assert res.category == IncidentCategory.MEDICAL_EMERGENCY


def test_classify_earthquake():
    prep = preprocess_incident("Massive Seismic Tremor", "6.4 richter scale earthquake shook the district, buildings cracked.")
    res = classify_incident(prep)
    assert res.category == IncidentCategory.EARTHQUAKE


def test_type_correction_when_user_reported_other_or_wrong():
    # User wrongly reported FLOOD, but narrative clearly indicates highway collision
    prep = preprocess_incident("Car Crash on Route 5", "Head-on collision between two trucks, traffic backed up.")
    res = classify_incident(prep, reported_type="FLOOD")
    assert res.category == IncidentCategory.ROAD_ACCIDENT
    assert res.suggested_correction is True
    assert res.original_type == "FLOOD"
