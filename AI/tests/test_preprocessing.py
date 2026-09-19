"""Unit tests for text preprocessing and signal extraction."""

from app.services.preprocessing import preprocess_incident, clean_text, extract_signals, extract_numeric_metrics


def test_clean_text_normalizes_whitespace_and_quotes():
    raw = "  Severe ‘fire’   at  warehouse…  several   workers “trapped”  "
    cleaned = clean_text(raw)
    assert cleaned == "Severe 'fire' at warehouse… several workers \"trapped\""


def test_signal_extraction():
    text = "Chemical factory explosion, chlorine gas leak with 4 workers trapped and 2 dead."
    signals = extract_signals(text)
    assert "hazardous_materials" in signals
    assert "explosion" in signals
    assert "people_trapped" in signals
    assert "fatalities" in signals
    assert "industrial" in signals


def test_numeric_metrics_extraction():
    text = "Expressway pileup: 3 people dead, 8 injured, and 2 trapped in crushed vehicle."
    metrics = extract_numeric_metrics(text)
    assert metrics["fatality_count"] == 3
    assert metrics["injured_count"] == 8
    assert metrics["trapped_count"] == 2


def test_preprocess_incident_combined():
    prep = preprocess_incident("Massive Fire in Hospital", "Smoke filling intensive care unit, 5 patients trapped.")
    assert "fire" in prep.signals
    assert "people_trapped" in prep.signals
    assert "critical_infrastructure" in prep.signals
    assert prep.numeric_metrics["trapped_count"] == 5
