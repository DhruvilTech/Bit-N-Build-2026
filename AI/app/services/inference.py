"""End-to-end AI Inference Orchestrator for Incident Classification."""

import math
from typing import List
from app.config import settings
from app.schemas.incident import (
    IncidentClassifyRequest,
    IncidentClassifyResponse,
    DetectedLocation,
)
from app.services.preprocessing import preprocess_incident, PreprocessingResult
from app.services.classifier import classify_incident, ClassificationResult
from app.services.severity import evaluate_severity, SeverityResult
from app.services.priority import determine_priority, PriorityResult
from app.services.explainability import build_reasoning
from app.services.location_extractor import extract_location_from_text
from app.utils.logger import logger


def calculate_calibrated_confidence(
    prep: PreprocessingResult,
    classification: ClassificationResult,
    severity: SeverityResult,
) -> float:
    """Calculates a calibrated confidence score between 0.00 and 1.00."""
    top_score = classification.top_score
    margin = classification.margin
    word_count = len(prep.tokens)
    num_signals = len(prep.signals)

    # 1. Base confidence from score and category margin
    if top_score <= 0.5:
        base_conf = 0.35
    elif top_score < 2.0:
        base_conf = 0.55 + (top_score * 0.05)
    elif top_score < 5.0:
        base_conf = 0.72 + min(0.12, margin * 0.03)
    else:
        # High evidence score
        base_conf = 0.85 + min(0.12, (margin / (top_score + 1e-5)) * 0.10)

    # 2. Text richness modifier
    if word_count < 6:
        # Extremely sparse input
        base_conf -= 0.20
    elif word_count < 12:
        base_conf -= 0.08
    elif word_count > 30:
        base_conf += 0.03

    # 3. Signal reinforcement
    if num_signals >= 3:
        base_conf += 0.05
    elif num_signals == 0:
        base_conf -= 0.15

    # 4. Consistency modifier
    if classification.suggested_correction:
        # Moderate deduction due to divergence from reported source
        base_conf -= 0.04

    # Bound strictly between 0.15 and 0.98
    clamped = max(0.15, min(0.98, base_conf))
    return round(clamped, 2)


def run_incident_classification(
    request: IncidentClassifyRequest,
) -> IncidentClassifyResponse:
    """Executes full inference pipeline on incident classification request."""
    logger.info(f"Running AI incident classification for title: '{request.title[:50]}'...")

    # 1. Preprocessing & Signal Extraction
    prep = preprocess_incident(request.title, request.description)

    # 2. Category Classification
    classification = classify_incident(prep, request.type)

    # 3. Severity Engine
    severity = evaluate_severity(prep, classification)

    # 4. Priority Engine
    priority = determine_priority(prep, classification, severity)

    # 5. Explainability
    reasoning = build_reasoning(prep, classification, severity, priority)

    # 6. Confidence Calibration
    confidence = calculate_calibrated_confidence(prep, classification, severity)
    is_low_confidence = confidence < settings.CONFIDENCE_THRESHOLD_LOW

    # 7. Geospatial Location Extraction
    location_res = extract_location_from_text(request.title, request.description)
    detected_loc = None
    if location_res.found:
        detected_loc = DetectedLocation(
            found=True,
            address=location_res.address,
            latitude=location_res.latitude,
            longitude=location_res.longitude,
            rawMention=location_res.raw_mention,
            confidence=location_res.confidence,
        )
    else:
        detected_loc = DetectedLocation(found=False)

    # Format human-readable signals
    tactical_signals: List[str] = prep.signals.copy()
    if prep.numeric_metrics["trapped_count"] > 0:
        tactical_signals.append(f"{prep.numeric_metrics['trapped_count']}_people_trapped")
    if prep.numeric_metrics["fatality_count"] > 0:
        tactical_signals.append(f"{prep.numeric_metrics['fatality_count']}_fatalities")

    response = IncidentClassifyResponse(
        incidentType=classification.category,
        severity=severity.level,
        priority=priority.level,
        confidence=confidence,
        signals=tactical_signals,
        reasoning=reasoning,
        detectedLocation=detected_loc,
        suggestedCorrection=classification.suggested_correction,
        originalType=classification.original_type,
        isLowConfidence=is_low_confidence,
        model=settings.AI_MODEL_NAME,
        version=settings.AI_SERVICE_VERSION,
    )

    logger.info(
        f"Classification complete: type={response.incidentType}, severity={response.severity}, "
        f"priority={response.priority}, confidence={response.confidence}, lowConf={response.isLowConfidence}, "
        f"detectedLoc={detected_loc.address if detected_loc.found else 'None'}"
    )

    return response
