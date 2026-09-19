"""Unit tests for operational priority engine and safety escalation rules."""

from app.schemas.incident import PriorityLevel
from app.services.preprocessing import preprocess_incident
from app.services.classifier import classify_incident
from app.services.severity import evaluate_severity
from app.services.priority import determine_priority


def test_priority_escalation_for_trapped_persons():
    prep = preprocess_incident("Small Office Incident", "Small fire in basement, but 2 cleaning staff trapped inside.")
    clf = classify_incident(prep)
    sev = evaluate_severity(prep, clf)
    prio = determine_priority(prep, clf, sev)
    assert prio.level == PriorityLevel.P1
    assert any("trapped" in r.lower() for r in prio.escalation_reasons) or prio.baseline == PriorityLevel.P1


def test_priority_time_critical_cardiac():
    prep = preprocess_incident("Medical Emergency", "Adult collapsed in subway station, cardiac arrest, CPR ongoing.")
    clf = classify_incident(prep)
    sev = evaluate_severity(prep, clf)
    prio = determine_priority(prep, clf, sev)
    assert prio.level == PriorityLevel.P1


def test_priority_low_p4():
    prep = preprocess_incident("Minor Trash Bin Fire", "Small trash bin fire in park, no injuries, empty area.")
    clf = classify_incident(prep)
    sev = evaluate_severity(prep, clf)
    prio = determine_priority(prep, clf, sev)
    assert prio.level == PriorityLevel.P4
