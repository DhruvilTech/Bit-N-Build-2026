"""Unified AI Incident Processing Pipeline (Phase 2).

Orchestrates preprocessing, classification, severity estimation,
priority determination, location extraction, duplicate detection,
and explainability behind a single operational function.
"""

from typing import List, Optional
from app.config import settings
from app.utils.logger import logger
from app.schemas.pipeline import (
    PipelineIncidentRequest,
    PipelineIncidentResponse,
    ClassificationOutput,
    SeverityOutput,
    PriorityOutput,
    LocationOutput,
    DuplicateOutput,
    IncidentTypeEnum,
    SeverityLevelEnum,
    PriorityLevelEnum,
)
from app.services.preprocessing import preprocess_incident, PreprocessingResult
from app.services.classifier import classify_incident, ClassificationResult
from app.services.severity import evaluate_severity, SeverityResult
from app.services.priority import determine_priority, PriorityResult
from app.services.inference import calculate_calibrated_confidence
from app.services.location_extractor import extract_location_from_text
from app.services.duplicate_detector import compare_incidents


def calculate_severity_confidence(prep: PreprocessingResult, severity: SeverityResult) -> float:
    """Calculates calibrated confidence score specifically for severity rating."""
    factors_count = len(severity.factors)
    score = severity.score
    word_count = len(prep.tokens)

    if factors_count >= 2 or score >= 10.0:
        base_conf = 0.95
    elif factors_count == 1:
        base_conf = 0.88
    elif score <= 1.0 and word_count >= 10:
        base_conf = 0.86
    else:
        base_conf = 0.72

    # Sparse text deduction
    if word_count < 6:
        base_conf -= 0.20
    elif word_count < 12:
        base_conf -= 0.08

    clamped = max(0.18, min(0.98, base_conf))
    return round(clamped, 2)


def analyze_incident_pipeline(request: PipelineIncidentRequest) -> PipelineIncidentResponse:
    """Executes the complete unified AI processing pipeline for an emergency incident."""
    logger.info(f"[AI Pipeline] Ingesting incident #{request.incidentId} from source {request.source}...")

    # 1. Text Preprocessing & Signal Extraction
    title = request.title or "Emergency Incident Report"
    prep = preprocess_incident(title, request.description)

    # 2. Category Classification
    classification = classify_incident(prep, reported_type=None)

    # 3. Evidence-Based Severity Engine
    severity = evaluate_severity(prep, classification)

    # 4. Deterministic Operational Priority
    priority = determine_priority(prep, classification, severity)

    # 5. Calibrated Confidence Evaluation
    classification_conf = calculate_calibrated_confidence(prep, classification, severity)
    severity_conf = calculate_severity_confidence(prep, severity)

    # 6. Geospatial Location Extraction & Validation
    loc_input = request.location
    req_lat = loc_input.latitude if loc_input else None
    req_lng = loc_input.longitude if loc_input else None
    req_addr = loc_input.address if loc_input else None

    # Text extraction fallback / enrichment
    extracted_loc = extract_location_from_text(title, request.description)
    final_lat = req_lat if req_lat is not None else (extracted_loc.latitude if extracted_loc.found else None)
    final_lng = req_lng if req_lng is not None else (extracted_loc.longitude if extracted_loc.found else None)
    final_addr = req_addr if (req_addr and req_addr.strip()) else (extracted_loc.address if extracted_loc.found else None)

    # 7. Duplicate Detection against Nearby Candidates (Context)
    duplicate_output = DuplicateOutput(
        isDuplicate=False,
        similarity=0.0,
        relatedIncidentId=None,
    )

    candidates = request.context.nearbyIncidents if (request.context and request.context.nearbyIncidents) else []
    if candidates:
        target_dict = {
            "incident_id": request.incidentId,
            "description": request.description,
            "latitude": final_lat,
            "longitude": final_lng,
            "timestamp": request.timestamp,
            "source": request.source,
        }

        best_match = None
        highest_score = 0.0

        for cand in candidates:
            # Skip comparing against self if same ID
            cand_id = cand.get_id()
            if cand_id == request.incidentId:
                continue

            cand_dict = {
                "incident_id": cand_id,
                "description": cand.description,
                "latitude": cand.get_lat(),
                "longitude": cand.get_lng(),
                "timestamp": cand.timestamp,
                "source": cand.source,
            }

            comparison = compare_incidents(target_dict, cand_dict)
            comb_score = comparison.get("combined_score", 0.0)

            if comb_score > highest_score:
                highest_score = comb_score
                best_match = comparison

        if best_match:
            is_dup = (
                best_match.get("classification") == "DUPLICATE"
                or highest_score >= settings.DUPLICATE_THRESHOLD
                or (highest_score >= 0.75 and best_match.get("classification") in ("DUPLICATE", "RELATED"))
            )
            duplicate_output = DuplicateOutput(
                isDuplicate=is_dup,
                similarity=round(highest_score, 2),
                relatedIncidentId=best_match.get("incident_b_id"),
            )


    # 8. Explainability Signals (Formatted for human & tactical comprehension)
    tactical_signals: List[str] = []
    # Add raw extracted signals
    for s in prep.signals:
        tactical_signals.append(s.replace("_", " "))

    # Add numeric indicator signals
    if prep.numeric_metrics["trapped_count"] > 0:
        tactical_signals.append(f"{prep.numeric_metrics['trapped_count']} trapped civilians")
    elif "people_trapped" in prep.signals and not any("trapped" in x for x in tactical_signals):
        tactical_signals.append("trapped civilians")

    if prep.numeric_metrics["fatality_count"] > 0:
        tactical_signals.append(f"{prep.numeric_metrics['fatality_count']} fatalities")

    # Ensure uniqueness while preserving order
    seen_signals = set()
    cleaned_signals: List[str] = []
    for s in tactical_signals:
        low = s.lower().strip()
        if low and low not in seen_signals:
            seen_signals.add(low)
            cleaned_signals.append(low)

    # 9. Human Review Flag Determination
    # Review required if confidence < threshold (0.70) in classification OR severity
    review_threshold = settings.CONFIDENCE_THRESHOLD_LOW
    requires_human_review = (
        classification_conf < review_threshold
        or severity_conf < review_threshold
    )

    # Priority reason
    priority_reason = priority.primary_justification
    if priority.escalation_reasons:
        priority_reason = "; ".join(priority.escalation_reasons)

    response = PipelineIncidentResponse(
        classification=ClassificationOutput(
            type=IncidentTypeEnum(classification.category.value),
            confidence=classification_conf,
        ),
        severity=SeverityOutput(
            level=SeverityLevelEnum(severity.level.value),
            confidence=severity_conf,
        ),
        priority=PriorityOutput(
            level=PriorityLevelEnum(priority.level.value),
            reason=priority_reason,
        ),
        location=LocationOutput(
            latitude=final_lat,
            longitude=final_lng,
            address=final_addr,
        ),
        duplicate=duplicate_output,
        signals=cleaned_signals,
        requiresHumanReview=requires_human_review,
    )

    logger.info(
        f"[AI Pipeline Complete] #{request.incidentId}: type={response.classification.type.value} "
        f"({response.classification.confidence}), severity={response.severity.level.value} "
        f"({response.severity.confidence}), priority={response.priority.level.value}, "
        f"isDup={response.duplicate.isDuplicate} (sim={response.duplicate.similarity}), "
        f"reviewReq={response.requiresHumanReview}"
    )

    return response
