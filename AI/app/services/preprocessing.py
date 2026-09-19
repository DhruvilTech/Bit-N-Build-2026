"""Text preprocessing and signal extraction module for emergency incident classification."""

import re
from typing import Dict, List, Any, Set


class PreprocessingResult:
    def __init__(
        self,
        raw_text: str,
        cleaned_text: str,
        tokens: List[str],
        signals: List[str],
        numeric_metrics: Dict[str, int],
        location_mentions: List[str],
    ):
        self.raw_text = raw_text
        self.cleaned_text = cleaned_text
        self.tokens = tokens
        self.signals = signals
        self.numeric_metrics = numeric_metrics
        self.location_mentions = location_mentions


WORD_NUMBERS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "several": 3, "multiple": 3, "many": 5,
}

# Tactical Regex Patterns
SIGNAL_PATTERNS: Dict[str, List[re.Pattern]] = {
    "people_trapped": [
        re.compile(r"\b(?:trapped|pinned(?:\s+down)?|stuck\s+(?:inside|under)|buried\s+under|cannot\s+escape|locked\s+in)\b", re.IGNORECASE),
        re.compile(r"\b(?:people|workers|children|victims|occupants|passengers|civilians|patients)\s+(?:trapped|stuck|pinned)\b", re.IGNORECASE),
        re.compile(r"\b(?:under(?:\s+the)?\s+rubble|under(?:\s+the)?\s+debris)\b", re.IGNORECASE),
    ],
    "fatalities": [
        re.compile(r"\b(?:dead|fatalit(?:y|ies)|killed|corpses?|deceased|casualt(?:y|ies))\b", re.IGNORECASE),
        re.compile(r"\b(?:\d+|multiple|several)\s+(?:dead|fatalities|killed|deaths)\b", re.IGNORECASE),
    ],
    "injuries": [
        re.compile(r"\b(?:injur(?:y|ies|ed)|wound(?:ed|s)|burns?|fractures?|bleeding|severe\s+trauma|unconscious)\b", re.IGNORECASE),
        re.compile(r"\b(?:\d+|multiple|several)\s+(?:injured|wounded|hurt)\b", re.IGNORECASE),
    ],
    "hazardous_materials": [
        re.compile(r"\b(?:hazardous|hazmat|chemicals?|toxic\s+gas|chlorine|ammonia|acid\s+leak|radiation|pipeline\s+leak|gas\s+leak|cyanide|flammable\s+liquid)\b", re.IGNORECASE),
        re.compile(r"\b(?:chemical\s+spill|toxic\s+fumes|chemical\s+plant|refinery\s+leak)\b", re.IGNORECASE),
    ],
    "explosion": [
        re.compile(r"\b(?:explos(?:ion|ive)|blast(?:ed)?|detonat(?:ed|ion)|blew\s+up|exploded)\b", re.IGNORECASE),
    ],
    "structural_collapse": [
        re.compile(r"\b(?:structural\s+collapse|building\s+collapsed?|bridge\s+collapse|roof\s+caved|wall\s+collapsed?)\b", re.IGNORECASE),
        re.compile(r"\b(?:debris|rubble|crushed\s+structure)\b", re.IGNORECASE),
    ],
    "critical_infrastructure": [
        re.compile(r"\b(?:hospital|power\s+station|power\s+grid|substation|nuclear\s+plant|water\s+treatment|airport|railway\s+station|oil\s+refinery|dam\s+breach|school)\b", re.IGNORECASE),
    ],
    "fire": [
        re.compile(r"\b(?:fires?|flames?|blaze|inferno|burning|smoke|engulfed\s+in\s+flames|wildfire|forest\s+fire|structure\s+fire)\b", re.IGNORECASE),
    ],
    "flood": [
        re.compile(r"\b(?:floods?|flooding|submerged|inundat(?:ed|ion)|waterlogged|flash\s+flood|rising\s+waters?|overflowing\s+river|dam\s+overflow|drowning)\b", re.IGNORECASE),
    ],
    "road_accident": [
        re.compile(r"\b(?:road\s+accident|car\s+crash|collision|pileup|overturned\s+(?:bus|truck|vehicle)|head-on\s+collision|hit\s+and\s+run|pedestrian\s+hit|highway\s+pileup)\b", re.IGNORECASE),
    ],
    "industrial": [
        re.compile(r"\b(?:factory|industrial\s+plant|manufacturing\s+unit|warehouse|refinery|boiler\s+blast|chemical\s+factory|workshop)\b", re.IGNORECASE),
    ],
    "medical_emergency": [
        re.compile(r"\b(?:cardiac\s+arrest|heart\s+attack|stroke|seizure|choking|respiratory\s+arrest|overdose|asthma\s+attack|unresponsive\s+patient|diabetic\s+coma)\b", re.IGNORECASE),
    ],
    "earthquake": [
        re.compile(r"\b(?:earthquake|tremors?|aftershocks?|seismic\s+activity|richter\s+scale|ground\s+shaking)\b", re.IGNORECASE),
    ],
}

NEGATION_PATTERNS = {
    "injuries": [
        re.compile(r"\b(?:no|zero|without|nil|none)\s+(?:injur(?:y|ies|ed)|wound(?:s|ed)|hurt)\b", re.IGNORECASE),
        re.compile(r"\bno\s+one\s+(?:is\s+)?injur(?:ed|y)\b", re.IGNORECASE),
    ],
    "fatalities": [
        re.compile(r"\b(?:no|zero|without|nil|none)\s+(?:fatalit(?:y|ies)|deaths?|dead|casualties)\b", re.IGNORECASE),
        re.compile(r"\bno\s+one\s+(?:is\s+)?dead\b", re.IGNORECASE),
    ],
    "people_trapped": [
        re.compile(r"\b(?:no|zero|without|nil|none)\s+(?:one|person|people|workers)?\s*trapped\b", re.IGNORECASE),
    ],
}


def clean_text(text: str) -> str:
    """Normalizes whitespace and standardizes common punctuation."""
    if not text:
        return ""
    text = re.sub(r"[\u2018\u2019]", "'", text)
    text = re.sub(r"[\u201C\u201D]", '"', text)
    text = re.sub(r"[\u2013\u2014]", "-", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_tokens(text: str) -> List[str]:
    """Tokenizes alphanumeric words from text."""
    return re.findall(r"\b[a-zA-Z0-9_\-]+\b", text.lower())


def parse_count(count_str: str) -> int:
    """Parses digit strings or English number words."""
    count_str = count_str.lower().strip()
    if count_str.isdigit():
        return int(count_str)
    return WORD_NUMBERS.get(count_str, 0)


def extract_numeric_metrics(text: str) -> Dict[str, int]:
    """Extracts counts of trapped individuals, deaths, and injuries when mentioned."""
    metrics = {"trapped_count": 0, "fatality_count": 0, "injured_count": 0}

    # e.g., "5 patients trapped", "4 workers trapped", "three trapped"
    trapped_match = re.search(
        r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:[a-zA-Z]+\s+)?trapped\b",
        text,
        re.IGNORECASE,
    )
    if trapped_match:
        metrics["trapped_count"] = parse_count(trapped_match.group(1))

    dead_match = re.search(
        r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:[a-zA-Z]+\s+)?(?:dead|fatalities|killed|deaths)\b",
        text,
        re.IGNORECASE,
    )
    if dead_match:
        metrics["fatality_count"] = parse_count(dead_match.group(1))

    injured_match = re.search(
        r"\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:[a-zA-Z]+\s+)?(?:injured|wounded|hurt|burn victims)\b",
        text,
        re.IGNORECASE,
    )
    if injured_match:
        metrics["injured_count"] = parse_count(injured_match.group(1))

    return metrics


def extract_signals(text: str) -> List[str]:
    """Extracts high-level tactical indicators from the text with negation handling."""
    signals_found: Set[str] = set()

    for signal_name, patterns in SIGNAL_PATTERNS.items():
        matched = False
        for pattern in patterns:
            if pattern.search(text):
                matched = True
                break

        if matched:
            # Check negation filter
            is_negated = False
            if signal_name in NEGATION_PATTERNS:
                for neg_pattern in NEGATION_PATTERNS[signal_name]:
                    if neg_pattern.search(text):
                        is_negated = True
                        break

            if not is_negated:
                signals_found.add(signal_name)

    return sorted(list(signals_found))


def preprocess_incident(title: str, description: str) -> PreprocessingResult:
    """Runs end-to-end normalization and signal extraction on incident text."""
    combined_raw = f"{title}. {description}".strip()
    cleaned = clean_text(combined_raw)
    tokens = extract_tokens(cleaned)
    signals = extract_signals(cleaned)
    numeric_metrics = extract_numeric_metrics(cleaned)

    # Location hints from text
    location_mentions = []
    loc_match = re.findall(r"\b(?:at|near|on|in)\s+([A-Z][a-zA-Z0-9\s,\.-]{2,30})", combined_raw)
    for loc in loc_match:
        trimmed = loc.strip()
        if len(trimmed) > 3 and trimmed.lower() not in {"the", "a", "an", "this", "that"}:
            location_mentions.append(trimmed)

    return PreprocessingResult(
        raw_text=combined_raw,
        cleaned_text=cleaned,
        tokens=tokens,
        signals=signals,
        numeric_metrics=numeric_metrics,
        location_mentions=location_mentions,
    )
