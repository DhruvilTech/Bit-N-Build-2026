"""Evidence-based severity evaluation engine for emergency incidents."""

from typing import List, Tuple
from app.schemas.incident import SeverityLevel, IncidentCategory
from app.services.preprocessing import PreprocessingResult
from app.services.classifier import ClassificationResult


class SeverityResult:
    def __init__(
        self,
        level: SeverityLevel,
        score: float,
        factors: List[str],
        primary_justification: str,
    ):
        self.level = level
        self.score = score
        self.factors = factors
        self.primary_justification = primary_justification


def evaluate_severity(
    prep: PreprocessingResult,
    classification: ClassificationResult,
) -> SeverityResult:
    """Calculates evidence-based severity (LOW, MEDIUM, HIGH, CRITICAL)."""
    signals = prep.signals
    metrics = prep.numeric_metrics
    factors: List[str] = []
    points: float = 0.0

    # 1. Fatalities and Casualties
    if metrics["fatality_count"] > 0:
        points += 10.0 + min(metrics["fatality_count"] * 2.0, 10.0)
        factors.append(f"{metrics['fatality_count']} confirmed fatalities")
    elif "fatalities" in signals:
        points += 10.0
        factors.append("Reported fatalities/casualties")

    # 2. People Trapped
    if metrics["trapped_count"] > 0:
        points += 12.0 + min(metrics["trapped_count"] * 2.0, 10.0)
        factors.append(f"{metrics['trapped_count']} persons reported trapped")
    elif "people_trapped" in signals:
        points += 12.0
        factors.append("Active entrapment: trapped victims reported")

    # 3. Injuries
    if metrics["injured_count"] > 5:
        points += 8.0
        factors.append(f"Mass-casualty injury count ({metrics['injured_count']} injured)")
    elif metrics["injured_count"] > 0:
        points += 4.0 + min(metrics["injured_count"] * 0.5, 4.0)
        factors.append(f"{metrics['injured_count']} injuries reported")
    elif "injuries" in signals:
        points += 4.0
        factors.append("Injuries reported on scene")

    # 4. Hazardous Materials & Explosions
    if "hazardous_materials" in signals and "explosion" in signals:
        points += 10.0
        factors.append("Chemical / hazardous materials explosion")
    elif "hazardous_materials" in signals:
        points += 6.0
        factors.append("Hazardous material or toxic gas involvement")
    elif "explosion" in signals:
        points += 6.0
        factors.append("Explosion / blast event")

    # 5. Structural Collapse
    if "structural_collapse" in signals:
        points += 8.0
        factors.append("Structural collapse or heavy debris")

    # 6. Critical Infrastructure Threat
    if "critical_infrastructure" in signals:
        points += 5.0
        factors.append("Threat to critical infrastructure facility")

    # 7. Category baseline modifiers
    lower_text = prep.cleaned_text.lower()
    if classification.category == IncidentCategory.EARTHQUAKE:
        points += 6.0
        factors.append("Seismic event impact")
    elif classification.category == IncidentCategory.FLOOD:
        if "drowning" in lower_text:
            points += 7.0
            factors.append("Drowning hazard reported")
        elif "submerged" in lower_text:
            points += 4.0
            factors.append("Submerged structures reported")
        else:
            points += 2.0
    elif classification.category == IncidentCategory.FIRE:
        if "engulfed" in lower_text or "inferno" in lower_text:
            points += 5.0
            factors.append("Uncontrolled major structural fire")
        elif any(k in lower_text for k in ["minor", "small", "trash", "sidewalk", "bin", "spark"]):
            points += 0.5
        else:
            points += 2.0

    # Determine Severity Level & Justification
    # Critical: Trapped people, confirmed deaths, or points >= 12.0
    if ("people_trapped" in signals or metrics["trapped_count"] > 0 or
        metrics["fatality_count"] > 0 or "fatalities" in signals or
        ("hazardous_materials" in signals and "explosion" in signals) or
        ("structural_collapse" in signals and ("injuries" in signals or "people_trapped" in signals)) or
        points >= 12.0):
        level = SeverityLevel.CRITICAL
        justification = (
            f"CRITICAL severity triggered by severe threat to human life: "
            + (", ".join(factors[:3]) if factors else "Extensive emergency danger markers.")
        )
    elif points >= 6.0:
        level = SeverityLevel.HIGH
        justification = (
            f"HIGH severity determined by elevated operational risk: "
            + (", ".join(factors[:3]) if factors else "Substantial damage or injury risk.")
        )
    elif points >= 2.5:
        level = SeverityLevel.MEDIUM
        justification = (
            f"MEDIUM severity: localized incident with manageable risk: "
            + (", ".join(factors[:2]) if factors else "Moderate operational incident.")
        )
    else:
        level = SeverityLevel.LOW
        justification = (
            "LOW severity: minor localized incident without reported injuries, trapped persons, or hazardous materials."
        )

    return SeverityResult(
        level=level,
        score=points,
        factors=factors,
        primary_justification=justification,
    )
