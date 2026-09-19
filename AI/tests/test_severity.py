"""Unit tests for severity calculation engine."""

from app.schemas.incident import SeverityLevel
from app.services.preprocessing import preprocess_incident
from app.services.classifier import classify_incident
from app.services.severity import evaluate_severity


def test_severity_critical_trapped_occupants():
    prep = preprocess_incident("Building Collapse", "Three workers trapped under concrete slab, screaming for help.")
    clf = classify_incident(prep)
    sev = evaluate_severity(prep, clf)
    assert sev.level == SeverityLevel.CRITICAL
    assert any("trapped" in f.lower() for f in sev.factors)


def test_severity_critical_hazmat_explosion():
    prep = preprocess_incident("Industrial Explosion", "Chemical factory exploded with toxic gas leak.")
    clf = classify_incident(prep)
    sev = evaluate_severity(prep, clf)
    assert sev.level == SeverityLevel.CRITICAL


def test_severity_high_injuries():
    prep = preprocess_incident("Bus Crash", "Overturned passenger bus, 6 injured with severe lacerations.")
    clf = classify_incident(prep)
    sev = evaluate_severity(prep, clf)
    assert sev.level in [SeverityLevel.HIGH, SeverityLevel.CRITICAL]


def test_severity_low_minor_spark():
    prep = preprocess_incident("Small Trash Fire", "Minor trash fire on sidewalk, no injuries, no threat to buildings.")
    clf = classify_incident(prep)
    sev = evaluate_severity(prep, clf)
    assert sev.level == SeverityLevel.LOW
