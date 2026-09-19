"""Operational priority calculation and deterministic safety escalation engine."""

from typing import List
from app.schemas.incident import PriorityLevel, SeverityLevel, IncidentCategory
from app.services.preprocessing import PreprocessingResult
from app.services.classifier import ClassificationResult
from app.services.severity import SeverityResult


class PriorityResult:
    def __init__(
        self,
        level: PriorityLevel,
        baseline: PriorityLevel,
        escalated: bool,
        escalation_reasons: List[str],
        primary_justification: str,
    ):
        self.level = level
        self.baseline = baseline
        self.escalated = escalated
        self.escalation_reasons = escalation_reasons
        self.primary_justification = primary_justification


# Baseline mapping from severity to priority
SEVERITY_TO_PRIORITY_MAP = {
    SeverityLevel.CRITICAL: PriorityLevel.P1,
    SeverityLevel.HIGH: PriorityLevel.P2,
    SeverityLevel.MEDIUM: PriorityLevel.P3,
    SeverityLevel.LOW: PriorityLevel.P4,
}


def determine_priority(
    prep: PreprocessingResult,
    classification: ClassificationResult,
    severity: SeverityResult,
) -> PriorityResult:
    """Calculates operational priority (P1-P4) enforcing deterministic safety overrides."""
    baseline = SEVERITY_TO_PRIORITY_MAP[severity.level]
    signals = prep.signals
    metrics = prep.numeric_metrics
    escalation_reasons: List[str] = []
    current_level = baseline

    # 1. Life Safety Critical Overrides -> Force P1
    if "people_trapped" in signals or metrics["trapped_count"] > 0:
        if current_level != PriorityLevel.P1:
            escalation_reasons.append("Immediate life entrapment detected — mandatory P1 escalation")
            current_level = PriorityLevel.P1

    if "fatalities" in signals or metrics["fatality_count"] > 0:
        if current_level != PriorityLevel.P1:
            escalation_reasons.append("Confirmed or suspected fatalities — mandatory P1 escalation")
            current_level = PriorityLevel.P1

    if "hazardous_materials" in signals and "explosion" in signals:
        if current_level != PriorityLevel.P1:
            escalation_reasons.append("Chemical/explosive catastrophe risk — mandatory P1 escalation")
            current_level = PriorityLevel.P1

    # Time-sensitive medical emergencies (cardiac arrest, drowning, respiratory arrest)
    cleaned_lower = prep.cleaned_text.lower()
    if any(k in cleaned_lower for k in ["cardiac arrest", "heart attack", "drowning", "choking", "unresponsive"]):
        if current_level != PriorityLevel.P1:
            escalation_reasons.append("Time-critical medical arrest/drowning condition — escalated to P1")
            current_level = PriorityLevel.P1

    # 2. Infrastructure & Mass Casualty Escalation
    if "critical_infrastructure" in signals:
        if current_level == PriorityLevel.P3:
            current_level = PriorityLevel.P2
            escalation_reasons.append("Critical infrastructure risk — escalated P3 to P2")
        elif current_level == PriorityLevel.P2:
            current_level = PriorityLevel.P1
            escalation_reasons.append("Critical infrastructure threat with high severity — escalated P2 to P1")

    if metrics["injured_count"] >= 5 and current_level in [PriorityLevel.P3, PriorityLevel.P4]:
        current_level = PriorityLevel.P2
        escalation_reasons.append(f"Mass casualty injury count ({metrics['injured_count']}) — escalated to P2")

    escalated = len(escalation_reasons) > 0

    # Operational Dispatch Justifications
    if current_level == PriorityLevel.P1:
        justification = (
            "P1 EMERGENCY: Immediate emergency response required (dispatch target < 8 mins). "
            + (f"Triggered by: {'; '.join(escalation_reasons)}." if escalation_reasons else "Life-threatening critical emergency.")
        )
    elif current_level == PriorityLevel.P2:
        justification = (
            "P2 URGENT: High priority response required (dispatch target < 15 mins). "
            + (f"Triggered by: {'; '.join(escalation_reasons)}." if escalation_reasons else "Significant operational hazard with high risk of escalation.")
        )
    elif current_level == PriorityLevel.P3:
        justification = (
            "P3 STANDARD: Standard operational dispatch (dispatch target < 30 mins). Localized condition requiring routine response resources."
        )
    else:
        justification = (
            "P4 LOW: Low operational urgency (scheduled / non-emergency response). Minimal immediate threat to life or property."
        )

    return PriorityResult(
        level=current_level,
        baseline=baseline,
        escalated=escalated,
        escalation_reasons=escalation_reasons,
        primary_justification=justification,
    )
