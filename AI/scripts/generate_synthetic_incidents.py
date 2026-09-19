"""Synthetic Emergency Incident Data Generator for Training & Evaluation.

Generates realistic emergency incident pairs with known ground-truth labels
(DUPLICATE, RELATED, SEPARATE) for training and evaluating the duplicate
detection model.

Methodology:
- Uses probabilistic/statistical distributions rather than fixed examples
- Base incidents are generated from parameterized templates with vocabulary variation
- DUPLICATE pairs: same incident described differently (paraphrased, different source)
- RELATED pairs: nearby incidents of similar type (different events, same area/time)
- SEPARATE pairs: unrelated incidents (different type, location, or time)

Coordinates use Gaussian jitter around real Indian city centers.
Timestamps use exponential distributions for realistic temporal gaps.

Usage:
    cd AI
    python -m scripts.generate_synthetic_incidents
"""

import json
import os
import random
import math
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Tuple, Any

# ---------------------------------------------------------------------------
# Vocabulary Banks (templates with slots for variation)
# ---------------------------------------------------------------------------

INCIDENT_TEMPLATES = {
    "FIRE": {
        "titles": [
            "Building fire reported in {area}",
            "Fire outbreak at {area} commercial complex",
            "Residential fire in {area} neighbourhood",
            "Major blaze at {area} warehouse",
            "Fire at {area} factory premises",
            "Structure fire reported near {area}",
            "Flames visible from {area} building",
        ],
        "descriptions": [
            "A {intensity} fire has broken out at a {structure} in {area}. {detail}. {response}.",
            "Reports of {intensity} flames and {smoke} smoke emanating from a {structure} in {area}. {detail}.",
            "Emergency services alerted to a {intensity} fire at a {structure} near {area}. {smoke} smoke visible. {response}.",
            "A {structure} in {area} is {burning}. {detail}. {response}. {casualties}.",
        ],
        "slots": {
            "intensity": ["massive", "large", "significant", "moderate", "raging", "uncontrolled", "spreading"],
            "structure": ["residential building", "commercial complex", "warehouse", "apartment block",
                         "factory unit", "office tower", "shopping mall", "godown", "market area"],
            "smoke": ["heavy", "thick", "dense", "billowing", "black", "acrid"],
            "burning": ["engulfed in flames", "ablaze", "on fire", "burning intensely"],
            "detail": ["Multiple floors are affected", "The fire appears to have started on the ground floor",
                       "Adjacent structures are at risk", "Electrical wiring may be the cause",
                       "Gas cylinders reported inside the premises", "Wind is fanning the flames"],
            "response": ["Fire brigade dispatched", "Multiple fire tenders on the way",
                        "Evacuation underway", "Residents being evacuated",
                        "Emergency teams responding"],
            "casualties": ["No casualties reported so far", "Several people reported trapped",
                          "Injuries reported", "Workers evacuated safely",
                          "Search and rescue operations underway"],
        },
    },
    "FLOOD": {
        "titles": [
            "Flash flooding in {area}",
            "River overflowing near {area}",
            "Severe waterlogging in {area}",
            "Flood situation worsening in {area}",
            "Water levels rising in {area} district",
            "Inundation reported in {area} lowlands",
        ],
        "descriptions": [
            "Heavy rainfall has caused {severity} flooding in {area}. {detail}. {impact}.",
            "{severity} waterlogging reported across {area} following continuous rainfall. {detail}.",
            "The {river} has overflowed its banks near {area}, {severity} inundating nearby areas. {impact}.",
            "Flash floods have hit {area} after {rainfall} of rainfall. {detail}. {impact}.",
        ],
        "slots": {
            "severity": ["severe", "significant", "extensive", "widespread", "critical"],
            "river": ["river", "nullah", "canal", "drainage channel", "stream"],
            "rainfall": ["heavy downpour", "continuous rain", "torrential rainfall",
                        "overnight rainfall", "three hours of heavy rain"],
            "detail": ["Roads are submerged", "Low-lying areas completely inundated",
                       "Underground crossings flooded", "Traffic completely disrupted",
                       "Power supply disrupted in several localities"],
            "impact": ["Hundreds of families displaced", "Rescue boats deployed",
                      "NDRF teams on standby", "Relief camps being set up",
                      "Several vehicles stranded on the highway"],
        },
    },
    "ROAD_ACCIDENT": {
        "titles": [
            "Major accident on {road}",
            "Multi-vehicle collision on {road}",
            "Fatal road crash near {area}",
            "Bus overturned on {road}",
            "Highway pileup reported on {road}",
            "Truck collision on {road}",
        ],
        "descriptions": [
            "A {severity} road accident has occurred on {road} near {area}. {vehicles}. {casualties}.",
            "{vehicles} on {road} near {area}. {casualties}. {response}.",
            "A {accident_type} on {road} involving {vehicle_count} vehicles. {casualties}. {response}.",
            "Reports of a {severity} {accident_type} near {area} on {road}. {vehicles}. {response}.",
        ],
        "slots": {
            "severity": ["serious", "major", "fatal", "severe"],
            "road": ["NH-48 highway", "national highway", "state highway",
                    "Ring Road", "expressway", "bypass road", "main arterial road"],
            "vehicles": ["A truck collided with a car", "Two buses collided head-on",
                        "A tanker overturned", "Multiple vehicles involved in a pileup",
                        "A bus skidded off the road", "A car rammed into a divider"],
            "accident_type": ["collision", "pileup", "head-on crash", "hit-and-run"],
            "vehicle_count": ["two", "three", "four", "multiple"],
            "casualties": ["Multiple injuries reported", "Driver critically injured",
                          "Several passengers injured", "One person dead on the spot",
                          "No fatalities reported", "Injured rushed to hospital"],
            "response": ["Ambulances dispatched", "Traffic diverted", "Highway patrol on scene",
                        "Rescue teams cutting through wreckage", "Jaws of life deployed"],
        },
    },
    "MEDICAL_EMERGENCY": {
        "titles": [
            "Medical emergency at {area}",
            "Person collapsed at {area}",
            "Cardiac arrest reported at {area}",
            "Mass casualty event at {area}",
            "Unresponsive patient at {area}",
        ],
        "descriptions": [
            "A {age} {gender} has {condition} at {area}. {detail}. {response}.",
            "Emergency medical assistance required at {area}. {detail}. {condition_detail}.",
            "Reports of a {condition} at {area}. {detail}. {response}.",
        ],
        "slots": {
            "age": ["elderly", "middle-aged", "young", "65-year-old", "45-year-old", "32-year-old"],
            "gender": ["male", "female", "person", "individual", "patient"],
            "condition": ["suffered a cardiac arrest", "collapsed and is unresponsive",
                         "experienced a severe seizure", "had a stroke",
                         "is experiencing respiratory distress", "is choking"],
            "condition_detail": ["Patient is unconscious and not breathing",
                                "Vitals are critical", "CPR being administered by bystanders",
                                "Severe chest pain reported before collapse"],
            "detail": ["Bystanders performing first aid", "Patient found on the sidewalk",
                       "Incident occurred in a shopping complex", "Patient has pre-existing conditions"],
            "response": ["Ambulance dispatched immediately", "Paramedics en route",
                        "Emergency medical team alerted", "Nearest hospital notified"],
        },
    },
    "EARTHQUAKE": {
        "titles": [
            "Earthquake tremors felt in {area}",
            "Seismic activity reported in {area} region",
            "Strong earthquake hits {area}",
            "Tremors shake {area} district",
        ],
        "descriptions": [
            "A {magnitude} earthquake has been recorded near {area}. {impact}. {response}.",
            "Tremors of {magnitude} magnitude felt across {area} and surrounding areas. {impact}.",
            "Strong seismic activity reported in {area}. {impact}. {response}. {aftershock}.",
        ],
        "slots": {
            "magnitude": ["4.2", "5.1", "5.8", "6.0", "6.4", "3.7", "4.8"],
            "impact": ["Buildings developed cracks", "Several structures damaged",
                      "Widespread panic among residents", "Power lines disrupted",
                      "Minor structural damage reported"],
            "response": ["Rescue teams mobilized", "Emergency shelters being set up",
                        "Authorities assessing damage", "Schools and offices evacuated"],
            "aftershock": ["Aftershocks expected", "Minor aftershocks already felt",
                          "Seismologists monitoring the situation"],
        },
    },
    "INDUSTRIAL_ACCIDENT": {
        "titles": [
            "Industrial accident at {area} factory",
            "Chemical leak at {area} plant",
            "Explosion at {area} industrial unit",
            "Gas leak reported at {area} facility",
            "Boiler blast at {area} factory",
        ],
        "descriptions": [
            "A {severity} {incident_type} has occurred at a {facility} in {area}. {detail}. {response}.",
            "Reports of a {incident_type} at the {facility} in {area} industrial zone. {detail}. {casualties}.",
            "An {incident_type} at the {facility} in {area} has caused {impact}. {response}. {casualties}.",
        ],
        "slots": {
            "severity": ["major", "severe", "critical", "significant"],
            "incident_type": ["chemical leak", "boiler explosion", "gas leak",
                             "ammonia leak", "explosion", "hazardous material spill"],
            "facility": ["chemical plant", "refinery", "manufacturing unit",
                        "pharmaceutical factory", "petrochemical complex", "industrial workshop"],
            "detail": ["Toxic fumes spreading to nearby areas", "Fire broke out following the explosion",
                       "Hazmat teams deployed", "Containment measures underway"],
            "impact": ["extensive damage to the facility", "evacuation of nearby residential areas",
                      "disruption to industrial operations"],
            "casualties": ["Several workers injured", "Two workers critically hurt",
                          "No casualties reported", "Workers evacuated before the blast",
                          "Search for missing workers underway"],
            "response": ["NDRF teams dispatched", "Hazmat response unit activated",
                        "Fire brigade and medical teams on site", "Industrial safety inspectors alerted"],
        },
    },
}

# Indian city coordinates for realistic geographic distribution
CITY_CENTERS = [
    {"name": "Vadodara", "lat": 22.3072, "lng": 73.1812},
    {"name": "Ahmedabad", "lat": 23.0225, "lng": 72.5714},
    {"name": "Mumbai", "lat": 19.0760, "lng": 72.8777},
    {"name": "Delhi", "lat": 28.6139, "lng": 77.2090},
    {"name": "Bengaluru", "lat": 12.9716, "lng": 77.5946},
    {"name": "Chennai", "lat": 13.0827, "lng": 80.2707},
    {"name": "Kolkata", "lat": 22.5726, "lng": 88.3639},
    {"name": "Hyderabad", "lat": 17.3850, "lng": 78.4867},
    {"name": "Pune", "lat": 18.5204, "lng": 73.8567},
    {"name": "Jaipur", "lat": 26.9124, "lng": 75.7873},
    {"name": "Surat", "lat": 21.1702, "lng": 72.8311},
    {"name": "Lucknow", "lat": 26.8467, "lng": 80.9462},
    {"name": "Bhopal", "lat": 23.2599, "lng": 77.4126},
]

SOURCES = ["CITIZEN", "SENSOR", "EMERGENCY_CALL", "FIELD_TEAM"]


# ---------------------------------------------------------------------------
# Generation Functions
# ---------------------------------------------------------------------------


def _fill_template(template: str, slots: Dict[str, List[str]], area: str) -> str:
    """Fill a template string with randomly selected slot values."""
    result = template.replace("{area}", area)
    for slot_name, options in slots.items():
        placeholder = "{" + slot_name + "}"
        if placeholder in result:
            result = result.replace(placeholder, random.choice(options), 1)
    return result


def _generate_base_incident(
    incident_type: str,
    city: Dict[str, Any],
    base_time: datetime,
    incident_id: str,
) -> Dict[str, Any]:
    """Generate a single base incident with realistic randomized content."""
    templates = INCIDENT_TEMPLATES[incident_type]

    title = _fill_template(random.choice(templates["titles"]), templates["slots"], city["name"])
    description = _fill_template(random.choice(templates["descriptions"]), templates["slots"], city["name"])

    # Gaussian jitter for coordinates (std dev ~0.01 degrees ≈ 1km)
    lat = city["lat"] + random.gauss(0, 0.01)
    lng = city["lng"] + random.gauss(0, 0.01)

    return {
        "incident_id": incident_id,
        "description": f"{title}. {description}",
        "latitude": round(lat, 6),
        "longitude": round(lng, 6),
        "timestamp": base_time.isoformat(),
        "source": random.choice(SOURCES),
        "type": incident_type,
        "city": city["name"],
    }


def _paraphrase_description(original: str) -> str:
    """Create a paraphrased version of a description by rearranging and swapping words."""
    # Simple but effective: split sentences, shuffle order, swap some words
    sentences = [s.strip() for s in original.split(".") if s.strip()]

    # Swap synonyms
    swaps = [
        ("fire", "blaze"), ("flames", "fire"), ("burning", "ablaze"),
        ("flood", "inundation"), ("waterlogging", "flooding"), ("submerged", "underwater"),
        ("accident", "crash"), ("collision", "crash"), ("injuries", "casualties"),
        ("earthquake", "seismic event"), ("tremors", "shaking"),
        ("explosion", "blast"), ("leak", "spill"),
        ("reported", "observed"), ("dispatched", "deployed"), ("severe", "serious"),
        ("major", "significant"), ("critical", "urgent"),
    ]

    result = original
    for old, new in swaps:
        if random.random() < 0.4 and old.lower() in result.lower():
            # Case-insensitive swap (first occurrence only)
            idx = result.lower().find(old.lower())
            result = result[:idx] + new + result[idx + len(old):]

    # Optionally rearrange sentences
    if len(sentences) > 2 and random.random() < 0.5:
        random.shuffle(sentences)
        result = ". ".join(sentences) + "."

    return result


def generate_duplicate_pair(
    pair_id: int,
    base_time: datetime,
) -> Tuple[Dict[str, Any], Dict[str, Any], str]:
    """Generate a DUPLICATE pair: same incident described differently."""
    incident_type = random.choice(list(INCIDENT_TEMPLATES.keys()))
    city = random.choice(CITY_CENTERS)

    base = _generate_base_incident(
        incident_type, city, base_time, f"INC-DUP-{pair_id:04d}-A"
    )

    # Duplicate: same location (tiny jitter), close time, paraphrased text
    dup = {
        "incident_id": f"INC-DUP-{pair_id:04d}-B",
        "description": _paraphrase_description(base["description"]),
        "latitude": round(base["latitude"] + random.gauss(0, 0.002), 6),  # ~200m jitter
        "longitude": round(base["longitude"] + random.gauss(0, 0.002), 6),
        "timestamp": (base_time + timedelta(minutes=random.expovariate(0.1))).isoformat(),
        "source": random.choice([s for s in SOURCES if s != base["source"]] or SOURCES),
        "type": incident_type,
        "city": city["name"],
    }

    return base, dup, "DUPLICATE"


def generate_related_pair(
    pair_id: int,
    base_time: datetime,
) -> Tuple[Dict[str, Any], Dict[str, Any], str]:
    """Generate a RELATED pair: nearby incidents of similar type."""
    incident_type = random.choice(list(INCIDENT_TEMPLATES.keys()))
    city = random.choice(CITY_CENTERS)

    base = _generate_base_incident(
        incident_type, city, base_time, f"INC-REL-{pair_id:04d}-A"
    )

    # Related: same area (moderate jitter ~2-5km), moderate time gap, different description
    related_city = dict(city)
    related_city["lat"] = city["lat"] + random.gauss(0, 0.03)  # ~3km
    related_city["lng"] = city["lng"] + random.gauss(0, 0.03)

    related = _generate_base_incident(
        incident_type,
        related_city,
        base_time + timedelta(hours=random.expovariate(0.3)),
        f"INC-REL-{pair_id:04d}-B",
    )

    return base, related, "RELATED"


def generate_separate_pair(
    pair_id: int,
    base_time: datetime,
) -> Tuple[Dict[str, Any], Dict[str, Any], str]:
    """Generate a SEPARATE pair: unrelated incidents."""
    types = list(INCIDENT_TEMPLATES.keys())
    type_a = random.choice(types)
    type_b = random.choice([t for t in types if t != type_a] or types)

    # Different cities
    cities = random.sample(CITY_CENTERS, min(2, len(CITY_CENTERS)))
    city_a = cities[0]
    city_b = cities[1] if len(cities) > 1 else cities[0]

    base = _generate_base_incident(
        type_a, city_a, base_time, f"INC-SEP-{pair_id:04d}-A"
    )
    sep = _generate_base_incident(
        type_b, city_b,
        base_time + timedelta(days=random.randint(1, 30)),
        f"INC-SEP-{pair_id:04d}-B",
    )

    return base, sep, "SEPARATE"


def generate_dataset(
    n_duplicates: int = 100,
    n_related: int = 80,
    n_separate: int = 120,
    seed: int = 42,
) -> Dict[str, Any]:
    """Generate a complete synthetic dataset with train/val/test splits.

    Args:
        n_duplicates: Number of DUPLICATE pairs to generate
        n_related: Number of RELATED pairs to generate
        n_separate: Number of SEPARATE pairs to generate
        seed: Random seed for reproducibility

    Returns:
        Dict with 'train', 'validation', 'test' splits and metadata.
    """
    random.seed(seed)
    base_time = datetime(2026, 1, 1, 8, 0, 0, tzinfo=timezone.utc)

    all_pairs = []

    # Generate pairs
    for i in range(n_duplicates):
        a, b, label = generate_duplicate_pair(i, base_time + timedelta(hours=random.randint(0, 8760)))
        all_pairs.append({"incident_a": a, "incident_b": b, "label": label})

    for i in range(n_related):
        a, b, label = generate_related_pair(i, base_time + timedelta(hours=random.randint(0, 8760)))
        all_pairs.append({"incident_a": a, "incident_b": b, "label": label})

    for i in range(n_separate):
        a, b, label = generate_separate_pair(i, base_time + timedelta(hours=random.randint(0, 8760)))
        all_pairs.append({"incident_a": a, "incident_b": b, "label": label})

    # Shuffle
    random.shuffle(all_pairs)

    # Split: 70% train, 15% validation, 15% test
    n_total = len(all_pairs)
    n_train = int(n_total * 0.70)
    n_val = int(n_total * 0.15)

    train = all_pairs[:n_train]
    val = all_pairs[n_train : n_train + n_val]
    test = all_pairs[n_train + n_val:]

    dataset = {
        "metadata": {
            "generator": "PS9-AI Synthetic Incident Generator",
            "seed": seed,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_pairs": n_total,
            "label_distribution": {
                "DUPLICATE": n_duplicates,
                "RELATED": n_related,
                "SEPARATE": n_separate,
            },
            "splits": {
                "train": len(train),
                "validation": len(val),
                "test": len(test),
            },
            "methodology": (
                "Incidents generated from parameterized templates with probabilistic "
                "slot filling. Duplicate pairs use paraphrased descriptions with "
                "Gaussian coordinate jitter (~200m) and short time gaps. Related pairs "
                "use same incident type with moderate spatial jitter (~3km). Separate "
                "pairs use different types, cities, and large time gaps. Coordinates "
                "sampled around real Indian city centers."
            ),
        },
        "train": train,
        "validation": val,
        "test": test,
    }

    return dataset


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate synthetic emergency incident data")
    parser.add_argument("--duplicates", type=int, default=100, help="Number of duplicate pairs")
    parser.add_argument("--related", type=int, default=80, help="Number of related pairs")
    parser.add_argument("--separate", type=int, default=120, help="Number of separate pairs")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    parser.add_argument(
        "--output",
        type=str,
        default=os.path.join(os.path.dirname(__file__), "..", "datasets", "synthetic_incidents.json"),
        help="Output file path",
    )
    args = parser.parse_args()

    print(f"Generating synthetic dataset (seed={args.seed})...")
    print(f"  Duplicates: {args.duplicates}")
    print(f"  Related: {args.related}")
    print(f"  Separate: {args.separate}")

    dataset = generate_dataset(
        n_duplicates=args.duplicates,
        n_related=args.related,
        n_separate=args.separate,
        seed=args.seed,
    )

    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2, ensure_ascii=False)

    print(f"\nDataset written to: {args.output}")
    print(f"  Total pairs: {dataset['metadata']['total_pairs']}")
    print(f"  Train: {dataset['metadata']['splits']['train']}")
    print(f"  Validation: {dataset['metadata']['splits']['validation']}")
    print(f"  Test: {dataset['metadata']['splits']['test']}")
    print("Done!")
