"""Hybrid semantic & rules-based classification engine for emergency incidents."""

from typing import Dict, List, Tuple, Optional
from app.schemas.incident import IncidentCategory
from app.services.preprocessing import PreprocessingResult


# Domain-specific keyword weight banks
CATEGORY_LEXICON: Dict[IncidentCategory, Dict[str, float]] = {
    IncidentCategory.FIRE: {
        "fire": 2.5, "flames": 2.5, "blaze": 2.5, "smoke": 1.8, "burning": 2.0,
        "inferno": 3.0, "extinguisher": 2.0, "wildfire": 3.5, "forest": 1.2,
        "arson": 2.5, "spark": 1.0, "electrical": 0.8, "engulfed": 2.0,
    },
    IncidentCategory.FLOOD: {
        "flood": 3.0, "flooding": 3.0, "submerged": 2.5, "inundated": 2.5,
        "waterlogged": 2.2, "drowning": 2.0, "overflowing": 2.0, "river": 1.5,
        "dam": 1.5, "rainfall": 1.5, "monsoon": 1.8, "water": 1.0, "rising": 1.2,
        "drainage": 1.5, "waterlogging": 2.0, "flash": 2.0,
    },
    IncidentCategory.ROAD_ACCIDENT: {
        "accident": 2.0, "crash": 2.5, "collision": 2.8, "highway": 1.8,
        "overturned": 2.2, "vehicle": 1.8, "car": 1.8, "truck": 2.0,
        "bus": 2.0, "motorcycle": 2.0, "pedestrian": 2.0, "head-on": 2.8,
        "pileup": 3.0, "hit-and-run": 2.5, "traffic": 1.2, "skidded": 1.8,
    },
    IncidentCategory.INDUSTRIAL_ACCIDENT: {
        "factory": 2.5, "industrial": 2.8, "refinery": 3.0, "chemical": 2.8,
        "plant": 2.0, "boiler": 3.0, "leak": 2.0, "hazmat": 3.0,
        "toxic": 2.5, "explosion": 2.0, "pipeline": 2.5, "manufacturing": 2.0,
        "warehouse": 1.8, "ammonia": 3.0, "gas": 1.5, "blast": 1.8,
    },
    IncidentCategory.MEDICAL_EMERGENCY: {
        "cardiac": 3.5, "heart": 3.0, "stroke": 3.5, "unconscious": 2.5,
        "seizure": 3.0, "respiratory": 3.0, "ambulance": 2.0, "paramedic": 2.0,
        "cpr": 3.0, "overdose": 3.0, "choking": 3.0, "diabetic": 3.0,
        "patient": 1.8, "chest": 2.0, "breathing": 2.2, "vital": 1.8,
    },
    IncidentCategory.EARTHQUAKE: {
        "earthquake": 4.0, "tremor": 3.5, "tremors": 3.5, "aftershock": 3.5,
        "aftershocks": 3.5, "richter": 3.5, "seismic": 3.5, "epicenter": 3.5,
        "shaking": 2.0, "quaking": 3.0, "ground": 1.2,
    },
    IncidentCategory.OTHER: {
        "general": 0.5, "disturbance": 1.0, "unknown": 1.0, "help": 0.5,
    },
}


class ClassificationResult:
    def __init__(
        self,
        category: IncidentCategory,
        scores: Dict[str, float],
        top_score: float,
        runner_up_score: float,
        margin: float,
        suggested_correction: bool,
        original_type: Optional[str],
    ):
        self.category = category
        self.scores = scores
        self.top_score = top_score
        self.runner_up_score = runner_up_score
        self.margin = margin
        self.suggested_correction = suggested_correction
        self.original_type = original_type


def classify_incident(
    prep: PreprocessingResult,
    reported_type: Optional[str] = None,
) -> ClassificationResult:
    """Classifies the incident into PS-9 operational categories using hybrid evidence scoring."""
    scores: Dict[IncidentCategory, float] = {cat: 0.0 for cat in IncidentCategory}
    cleaned = prep.cleaned_text.lower()
    tokens = prep.tokens
    signals = prep.signals

    # 1. Lexical token accumulation
    for token in tokens:
        for cat, lexicon in CATEGORY_LEXICON.items():
            if token in lexicon:
                scores[cat] += lexicon[token]

    # 2. High-conviction tactical signal boosts
    if "hazardous_materials" in signals or "industrial" in signals:
        scores[IncidentCategory.INDUSTRIAL_ACCIDENT] += 4.0
        if "explosion" in signals:
            scores[IncidentCategory.INDUSTRIAL_ACCIDENT] += 3.0

    if "fire" in signals and "industrial" not in signals and "hazardous_materials" not in signals:
        scores[IncidentCategory.FIRE] += 4.5

    if "flood" in signals:
        scores[IncidentCategory.FLOOD] += 5.0

    if "road_accident" in signals:
        scores[IncidentCategory.ROAD_ACCIDENT] += 4.5

    if "medical_emergency" in signals:
        scores[IncidentCategory.MEDICAL_EMERGENCY] += 5.0

    if "earthquake" in signals:
        scores[IncidentCategory.EARTHQUAKE] += 5.0

    # 3. Contextual disambiguation
    # If both fire and industrial chemical explosion exist, industrial accident takes precedence
    if scores[IncidentCategory.INDUSTRIAL_ACCIDENT] >= 3.0 and ("industrial" in signals or "hazardous_materials" in signals):
        scores[IncidentCategory.INDUSTRIAL_ACCIDENT] += 2.0

    # If earthquake causes collapse and fire, seismic root cause takes precedence
    if "earthquake" in signals:
        scores[IncidentCategory.EARTHQUAKE] += 3.0

    # Rank categories
    sorted_cats = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_cat, top_score = sorted_cats[0]
    runner_up_cat, runner_up_score = sorted_cats[1] if len(sorted_cats) > 1 else (IncidentCategory.OTHER, 0.0)

    # Fallback to OTHER if no conclusive signals
    if top_score < 1.0:
        top_cat = IncidentCategory.OTHER
        if reported_type:
            # Check if reported_type matches a valid category
            try:
                norm_reported = reported_type.strip().upper()
                matched_enum = IncidentCategory(norm_reported)
                top_cat = matched_enum
            except ValueError:
                top_cat = IncidentCategory.OTHER

    # Check for suggested correction
    suggested_correction = False
    original_type = None

    if reported_type:
        norm_reported = reported_type.strip().upper()
        if norm_reported in [c.value for c in IncidentCategory]:
            original_type = norm_reported
            if norm_reported != top_cat.value and top_score >= 2.0:
                suggested_correction = True
        else:
            original_type = reported_type
            if top_cat != IncidentCategory.OTHER:
                suggested_correction = True

    margin = max(0.0, top_score - runner_up_score)
    scores_dict = {cat.value: round(val, 2) for cat, val in scores.items()}

    return ClassificationResult(
        category=top_cat,
        scores=scores_dict,
        top_score=top_score,
        runner_up_score=runner_up_score,
        margin=margin,
        suggested_correction=suggested_correction,
        original_type=original_type,
    )
