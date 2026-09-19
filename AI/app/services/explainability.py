"""Explainability service for generating machine-readable reasoning and signals."""

from app.schemas.incident import ReasoningDetail
from app.services.preprocessing import PreprocessingResult
from app.services.classifier import ClassificationResult
from app.services.severity import SeverityResult
from app.services.priority import PriorityResult


def build_reasoning(
    prep: PreprocessingResult,
    classification: ClassificationResult,
    severity: SeverityResult,
    priority: PriorityResult,
) -> ReasoningDetail:
    """Constructs structured, machine-readable reasoning for triage operators."""

    # 1. Type reasoning
    top_signals = [s.replace("_", " ") for s in prep.signals[:4]]
    if classification.suggested_correction and classification.original_type:
        type_explanation = (
            f"Classified as {classification.category.value} based on evidence ({', '.join(top_signals) if top_signals else 'textual patterns'}). "
            f"Note: Overrides reported type '{classification.original_type}' due to strong indicators."
        )
    else:
        type_explanation = (
            f"Classified as {classification.category.value} based on key emergency markers: "
            f"{', '.join(top_signals) if top_signals else 'general emergency terminology'}."
        )

    # 2. Severity reasoning
    severity_explanation = severity.primary_justification

    # 3. Priority reasoning
    priority_explanation = priority.primary_justification

    return ReasoningDetail(
        incidentType=type_explanation,
        severity=severity_explanation,
        priority=priority_explanation,
    )
