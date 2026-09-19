"""Geospatial Location Extraction and Geocoding Engine for Emergency Incident Narratives.

Extracts mentions of cities, landmarks, rivers, industrial corridors, and regions from
unstructured text narratives and resolves them to accurate coordinates and standardized addresses.
"""

import re
from typing import Optional, Dict, Any, List, Tuple
from pydantic import BaseModel, Field

# High-accuracy offline gazetteer with normalized names, coordinates, and aliases
OFFLINE_GAZETTEER: List[Dict[str, Any]] = [
    # Gujarat Cities & Landmarks
    {
        "name": "Downtown Vadodara, Gujarat",
        "lat": 22.3072,
        "lng": 73.1812,
        "aliases": [
            "vadodara", "baroda", "downtown vadodara", "vadodara city", "sayajigunj",
            "alkapuri", "manjalpur", "karelibaug", "gorwa", "makarpura", "fatehgunj",
            "akota", "gotri", "sama", "wadi vadodara", "raopura", "mandvi vadodara"
        ],
    },
    {
        "name": "Vishwamitri River Basin, Vadodara, Gujarat",
        "lat": 22.3105,
        "lng": 73.1800,
        "aliases": [
            "vishwamitri", "vishwamitri river", "vishwamitri river basin", "river vishwamitri",
            "vishwamitri bridge"
        ],
    },
    {
        "name": "Ahmedabad, Gujarat",
        "lat": 23.0225,
        "lng": 72.5714,
        "aliases": ["ahmedabad", "ahmadabad", "sabarmati", "maninagar", "navrangpura", "sg highway", "bopal"],
    },
    {
        "name": "Surat, Gujarat",
        "lat": 21.1702,
        "lng": 72.8311,
        "aliases": ["surat", "surat city", "adajan", "varachha", "ring road surat", "hazira"],
    },
    {
        "name": "Rajkot, Gujarat",
        "lat": 22.3039,
        "lng": 70.8022,
        "aliases": ["rajkot", "kalawad road", "yagnik road"],
    },
    {
        "name": "Gandhinagar, Gujarat",
        "lat": 23.2156,
        "lng": 72.6369,
        "aliases": ["gandhinagar", "gift city", "infocity gandhinagar"],
    },
    {
        "name": "Bhavnagar, Gujarat",
        "lat": 21.7645,
        "lng": 72.1519,
        "aliases": ["bhavnagar", "alangi"],
    },
    {
        "name": "Jamnagar, Gujarat",
        "lat": 22.4707,
        "lng": 70.0577,
        "aliases": ["jamnagar", "motikhavdi"],
    },
    {
        "name": "Bharuch, Gujarat",
        "lat": 21.7051,
        "lng": 72.9959,
        "aliases": ["bharuch", "narmada river", "ankleshwar", "dahej"],
    },
    {
        "name": "Anand, Gujarat",
        "lat": 22.5645,
        "lng": 72.9289,
        "aliases": ["anand", "vallabh vidyanagar"],
    },

    # Major Indian Metros
    {
        "name": "Connaught Place, New Delhi",
        "lat": 28.6328,
        "lng": 77.2197,
        "aliases": [
            "delhi", "new delhi", "connaught place", "connaught", "central connaught commercial ring",
            "rohini", "dwarka", "saket", "karol bagh", "chandni chowk"
        ],
    },
    {
        "name": "South Highway Express Corridor Km 28, Delhi NCR",
        "lat": 28.5720,
        "lng": 77.1620,
        "aliases": [
            "south highway express corridor km 28", "nh-48 expressway", "gurgaon expressway",
            "nh48 expressway gateway"
        ],
    },
    {
        "name": "Apex Petrochemical Complex, Sector 4, NCR",
        "lat": 28.6289,
        "lng": 77.2065,
        "aliases": [
            "apex petrochemical", "apex petrochemical complex", "sector 4 industrial gate",
            "petrochemical complex zone 3"
        ],
    },
    {
        "name": "Docklands Maritime Container Terminal, Port Zone",
        "lat": 28.6410,
        "lng": 77.2340,
        "aliases": [
            "docklands maritime container terminal", "docklands cargo terminal", "maritime container terminal"
        ],
    },
    {
        "name": "Riverbank North Elevated Colony",
        "lat": 28.6600,
        "lng": 77.2010,
        "aliases": [
            "riverbank north elevated colony", "riverbank north embankment"
        ],
    },
    {
        "name": "Mumbai, Maharashtra",
        "lat": 19.0760,
        "lng": 72.8777,
        "aliases": ["mumbai", "bombay", "andheri", "bandra", "colaba", "dadar", "borivali", "navi mumbai", "thane"],
    },
    {
        "name": "Bengaluru, Karnataka",
        "lat": 12.9716,
        "lng": 77.5946,
        "aliases": ["bengaluru", "bangalore", "whitefield", "koramangala", "indiranagar", "electronic city", "hebbal"],
    },
    {
        "name": "Kolkata, West Bengal",
        "lat": 22.5726,
        "lng": 88.3639,
        "aliases": ["kolkata", "calcutta", "howrah", "salt lake", "new town kolkata"],
    },
    {
        "name": "Chennai, Tamil Nadu",
        "lat": 13.0827,
        "lng": 80.2707,
        "aliases": ["chennai", "madras", "t nagar", "velachery", "adyar", "anna nagar"],
    },
    {
        "name": "Hyderabad, Telangana",
        "lat": 17.3850,
        "lng": 78.4867,
        "aliases": ["hyderabad", "secunderabad", "hitech city", "gachibowli", "banjara hills", "jubilee hills"],
    },
    {
        "name": "Pune, Maharashtra",
        "lat": 18.5204,
        "lng": 73.8567,
        "aliases": ["pune", "hinjewadi", "kothrud", "viman nagar", "hadapsar", "wakad"],
    },
    {
        "name": "Jaipur, Rajasthan",
        "lat": 26.9124,
        "lng": 75.7873,
        "aliases": ["jaipur", "pink city", "mansarovar jaipur", "vaishali nagar jaipur"],
    },
    {
        "name": "Lucknow, Uttar Pradesh",
        "lat": 26.8467,
        "lng": 80.9462,
        "aliases": ["lucknow", "gomti nagar", "hazratganj"],
    },
    {
        "name": "Bhopal, Madhya Pradesh",
        "lat": 23.2599,
        "lng": 77.4126,
        "aliases": ["bhopal", "kolar road", "mp nagar"],
    },
    {
        "name": "Indore, Madhya Pradesh",
        "lat": 22.7196,
        "lng": 75.8577,
        "aliases": ["indore", "vijay nagar indore"],
    },
]

# Common generic words to filter out if caught by regex
GENERIC_STOPWORDS = {
    "the", "a", "an", "this", "that", "these", "those", "all", "several", "multiple",
    "many", "some", "area", "building", "residential", "commercial", "downtown",
    "river", "site", "scene", "zone", "street", "road", "city", "place", "center",
    "today", "yesterday", "morning", "afternoon", "evening", "night", "september",
    "october", "november", "december", "january", "february", "march", "april",
    "may", "june", "july", "august"
}


class DetectedLocationResult:
    def __init__(
        self,
        found: bool,
        address: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        raw_mention: Optional[str] = None,
        confidence: Optional[float] = None,
    ):
        self.found = found
        self.address = address
        self.latitude = latitude
        self.longitude = longitude
        self.raw_mention = raw_mention
        self.confidence = confidence

    def to_dict(self) -> Dict[str, Any]:
        return {
            "found": self.found,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "rawMention": self.raw_mention,
            "confidence": self.confidence,
        }


def extract_location_from_text(title: str, description: str) -> DetectedLocationResult:
    """Scans title and description for geographic entities and resolves coordinates."""
    combined = f"{title}. {description}".strip()
    lower_text = combined.lower()

    # 1. First pass: Match against offline gazetteer aliases
    # We sort gazetteer entries by alias length (descending) to match more specific locations first
    # e.g., "vishwamitri river" before "vadodara"
    matched_entry: Optional[Dict[str, Any]] = None
    matched_alias: Optional[str] = None
    best_alias_len = 0

    # Specifically check if both river/sub-locality and city are present
    has_vadodara = any(v in lower_text for v in ["vadodara", "baroda"])
    has_vishwamitri = "vishwamitri" in lower_text

    if has_vadodara and has_vishwamitri:
        # Highest fidelity compound match
        return DetectedLocationResult(
            found=True,
            address="Vishwamitri River, Downtown Vadodara, Gujarat",
            latitude=22.3105,
            longitude=73.1800,
            raw_mention="Vishwamitri River, Vadodara",
            confidence=0.98,
        )

    for entry in OFFLINE_GAZETTEER:
        for alias in entry["aliases"]:
            # Word boundary regex check
            pattern = rf"\b{re.escape(alias)}\b"
            if re.search(pattern, lower_text):
                if len(alias) > best_alias_len:
                    best_alias_len = len(alias)
                    matched_entry = entry
                    matched_alias = alias

    if matched_entry:
        # Check if "downtown <matched>" or compound prefix exists in original text
        raw_snippet = matched_alias.title()
        downtown_match = re.search(rf"\b(downtown\s+{re.escape(matched_alias)})\b", lower_text)
        if downtown_match:
            raw_snippet = downtown_match.group(1).title()

        return DetectedLocationResult(
            found=True,
            address=matched_entry["name"],
            latitude=matched_entry["lat"],
            longitude=matched_entry["lng"],
            raw_mention=raw_snippet,
            confidence=0.95,
        )

    # 2. Second pass: Tactical geographic pattern extraction
    # Patterns like "in Downtown Vadodara", "at Sector 12", "near Narmada Dam"
    geo_patterns = [
        r"\b(?:in|at|near|around|along)\s+([A-Z][a-zA-Z0-9\s,\.-]{2,30})",
        r"\b([A-Z][a-zA-Z0-9\s]+(?:\s+(?:River|Lake|Bridge|Canal|Expressway|Highway|Road|Nagar|Colony|Sector\s+\d+|Complex|Terminal|Bazaar|Ring)))\b",
    ]

    for p in geo_patterns:
        for m in re.finditer(p, combined):
            extracted = m.group(1).strip()
            # Clean punctuation at end
            extracted = re.sub(r"[\.,;:!?]+$", "", extracted).strip()
            tokens = [w.lower() for w in extracted.split()]
            # Ensure not purely stopwords
            meaningful_tokens = [t for t in tokens if t not in GENERIC_STOPWORDS]
            if meaningful_tokens and len(extracted) >= 3:
                # Check if this extracted text matches any gazetteer entry
                for entry in OFFLINE_GAZETTEER:
                    for alias in entry["aliases"]:
                        if alias in extracted.lower():
                            return DetectedLocationResult(
                                found=True,
                                address=entry["name"],
                                latitude=entry["lat"],
                                longitude=entry["lng"],
                                raw_mention=extracted,
                                confidence=0.90,
                            )

    # 3. No location detected in the narrative
    return DetectedLocationResult(found=False)
