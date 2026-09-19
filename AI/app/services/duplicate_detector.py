"""Semantic duplicate and related incident detection service.

Provides genuine ML-based duplicate detection using:
1. Sentence Transformer embeddings for semantic similarity (cosine similarity)
2. Haversine formula for geographic proximity
3. Exponential decay for temporal closeness
4. Optional trained classifier (logistic regression) for final classification
5. Union-Find based clustering for multi-incident consolidation

All numerical outputs are computed from actual input data — nothing is hardcoded.
"""

import math
import os
import json
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

import numpy as np

from app.config import settings
from app.utils.logger import logger
from app.services.embedding_service import embedding_service


# ---------------------------------------------------------------------------
# Geographic Utilities
# ---------------------------------------------------------------------------

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Compute great-circle distance between two lat/lon points in kilometres.

    Uses the Haversine formula. Returns 0.0 if both points are identical.
    """
    lat1_r, lat2_r = math.radians(lat1), math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_KM * c


def geographic_similarity(
    lat1: Optional[float],
    lon1: Optional[float],
    lat2: Optional[float],
    lon2: Optional[float],
    radius_km: Optional[float] = None,
) -> float:
    """Compute geographic similarity as exponential decay of Haversine distance.

    Returns a value in [0.0, 1.0] where 1.0 means same location.
    If either coordinate pair is missing, returns 0.0 (no geographic evidence).
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return 0.0

    radius = radius_km if radius_km is not None else settings.GEO_RADIUS_KM
    if radius <= 0:
        radius = 5.0

    distance = haversine_km(lat1, lon1, lat2, lon2)

    # Exponential decay: similarity = exp(-distance / radius)
    # At distance == radius, similarity ≈ 0.368
    # At distance == 0, similarity = 1.0
    similarity = math.exp(-distance / radius)
    return round(similarity, 6)


# ---------------------------------------------------------------------------
# Temporal Utilities
# ---------------------------------------------------------------------------


def parse_timestamp(ts: Any) -> Optional[datetime]:
    """Parse a timestamp from string or datetime object.

    Supports ISO 8601 strings and datetime objects.
    Returns None if parsing fails.
    """
    if ts is None:
        return None
    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            return ts.replace(tzinfo=timezone.utc)
        return ts
    if isinstance(ts, str):
        ts = ts.strip()
        if not ts:
            return None
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except (ValueError, TypeError):
            return None
    return None


def temporal_similarity(
    ts1: Any,
    ts2: Any,
    window_hours: Optional[float] = None,
) -> float:
    """Compute temporal similarity as exponential decay of time difference.

    Returns a value in [0.0, 1.0] where 1.0 means simultaneous events.
    If either timestamp is missing/invalid, returns 0.0 (no temporal evidence).
    """
    dt1 = parse_timestamp(ts1)
    dt2 = parse_timestamp(ts2)

    if dt1 is None or dt2 is None:
        return 0.0

    window = window_hours if window_hours is not None else settings.TEMPORAL_WINDOW_HOURS
    if window <= 0:
        window = 24.0

    diff_hours = abs((dt2 - dt1).total_seconds()) / 3600.0

    # Exponential decay: similarity = exp(-diff / window)
    similarity = math.exp(-diff_hours / window)
    return round(similarity, 6)


# ---------------------------------------------------------------------------
# Semantic Similarity
# ---------------------------------------------------------------------------


def semantic_similarity(text_a: str, text_b: str) -> float:
    """Compute semantic similarity between two texts using sentence embeddings.

    Returns cosine similarity in [-1.0, 1.0] (typically [0.0, 1.0] for natural text).
    Since embeddings are L2-normalized, cosine similarity = dot product.
    """
    if not text_a or not text_a.strip() or not text_b or not text_b.strip():
        return 0.0

    emb_a = embedding_service.encode(text_a)
    emb_b = embedding_service.encode(text_b)

    # Dot product of L2-normalized vectors = cosine similarity
    cos_sim = float(np.dot(emb_a, emb_b))

    # Clamp to [0, 1] — negative cosine similarity is theoretically possible
    # but means the texts are semantically opposite; treat as 0 for our purposes.
    return round(max(0.0, min(1.0, cos_sim)), 6)


# ---------------------------------------------------------------------------
# Combined Similarity & Classification
# ---------------------------------------------------------------------------


def combined_similarity(
    semantic_sim: float,
    geo_sim: float,
    temporal_sim: float,
    weight_semantic: Optional[float] = None,
    weight_geo: Optional[float] = None,
    weight_temporal: Optional[float] = None,
) -> float:
    """Compute weighted combination of similarity dimensions.

    Weights are normalized to sum to 1.0. If geographic or temporal data is
    missing (sim == 0), their weight is redistributed to semantic similarity.
    """
    ws = weight_semantic if weight_semantic is not None else settings.SIMILARITY_WEIGHT_SEMANTIC
    wg = weight_geo if weight_geo is not None else settings.SIMILARITY_WEIGHT_GEO
    wt = weight_temporal if weight_temporal is not None else settings.SIMILARITY_WEIGHT_TEMPORAL

    # Redistribute weight from missing dimensions to semantic
    total_available = ws
    if geo_sim > 0:
        total_available += wg
    if temporal_sim > 0:
        total_available += wt

    if total_available <= 0:
        return 0.0

    # Normalize weights to sum to 1
    effective_ws = ws / total_available
    effective_wg = (wg / total_available) if geo_sim > 0 else 0.0
    effective_wt = (wt / total_available) if temporal_sim > 0 else 0.0

    score = (
        effective_ws * semantic_sim
        + effective_wg * geo_sim
        + effective_wt * temporal_sim
    )
    return round(max(0.0, min(1.0, score)), 6)


def classify_pair(
    combined_score: float,
    duplicate_threshold: Optional[float] = None,
    related_threshold: Optional[float] = None,
) -> str:
    """Classify a pair based on combined similarity score.

    Returns:
        "DUPLICATE", "RELATED", or "SEPARATE"
    """
    dup_thresh = duplicate_threshold if duplicate_threshold is not None else settings.DUPLICATE_THRESHOLD
    rel_thresh = related_threshold if related_threshold is not None else settings.RELATED_THRESHOLD

    if combined_score >= dup_thresh:
        return "DUPLICATE"
    elif combined_score >= rel_thresh:
        return "RELATED"
    else:
        return "SEPARATE"


def build_reasoning(
    semantic_sim: float,
    geo_sim: float,
    temporal_sim: float,
    classification: str,
) -> List[str]:
    """Generate human-readable reasoning based on actual computed values."""
    reasons = []

    # Semantic reasoning
    if semantic_sim >= 0.85:
        reasons.append(f"Very high semantic similarity ({semantic_sim:.2f}) — reports describe highly similar events")
    elif semantic_sim >= 0.65:
        reasons.append(f"Moderate-high semantic similarity ({semantic_sim:.2f}) — reports share significant thematic overlap")
    elif semantic_sim >= 0.40:
        reasons.append(f"Moderate semantic similarity ({semantic_sim:.2f}) — some thematic overlap between reports")
    else:
        reasons.append(f"Low semantic similarity ({semantic_sim:.2f}) — reports describe different situations")

    # Geographic reasoning
    if geo_sim > 0:
        if geo_sim >= 0.90:
            reasons.append(f"Incidents are geographically very close (geo similarity: {geo_sim:.2f})")
        elif geo_sim >= 0.60:
            reasons.append(f"Incidents are in the same general area (geo similarity: {geo_sim:.2f})")
        elif geo_sim >= 0.30:
            reasons.append(f"Incidents are moderately distant (geo similarity: {geo_sim:.2f})")
        else:
            reasons.append(f"Incidents are geographically distant (geo similarity: {geo_sim:.2f})")
    else:
        reasons.append("Geographic data unavailable for one or both incidents")

    # Temporal reasoning
    if temporal_sim > 0:
        if temporal_sim >= 0.90:
            reasons.append(f"Reports occurred very close in time (temporal similarity: {temporal_sim:.2f})")
        elif temporal_sim >= 0.60:
            reasons.append(f"Reports occurred within a reasonable time window (temporal similarity: {temporal_sim:.2f})")
        elif temporal_sim >= 0.30:
            reasons.append(f"Reports are moderately separated in time (temporal similarity: {temporal_sim:.2f})")
        else:
            reasons.append(f"Reports are significantly separated in time (temporal similarity: {temporal_sim:.2f})")
    else:
        reasons.append("Temporal data unavailable for one or both incidents")

    return reasons


# ---------------------------------------------------------------------------
# Trained Classifier (optional enhancement)
# ---------------------------------------------------------------------------


_trained_classifier = None
_classifier_loaded = False


def _load_trained_classifier() -> bool:
    """Attempt to load a trained duplicate classifier from the models directory.

    Returns True if successfully loaded, False otherwise.
    The system falls back to threshold-based classification if no trained model exists.
    """
    global _trained_classifier, _classifier_loaded

    if _classifier_loaded:
        return _trained_classifier is not None

    _classifier_loaded = True

    model_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
        settings.MODELS_DIR,
        "duplicate_classifier.joblib",
    )

    if not os.path.exists(model_path):
        logger.info(
            f"No trained duplicate classifier found at {model_path}. "
            f"Using threshold-based classification."
        )
        return False

    try:
        import joblib
        _trained_classifier = joblib.load(model_path)
        logger.info(f"Loaded trained duplicate classifier from {model_path}")
        return True
    except Exception as e:
        logger.warning(f"Failed to load trained classifier: {e}. Using threshold-based fallback.")
        _trained_classifier = None
        return False


def classify_with_trained_model(
    semantic_sim: float,
    geo_sim: float,
    temporal_sim: float,
) -> Optional[Tuple[str, float]]:
    """Use the trained classifier to predict duplicate/related/separate.

    Returns (classification, probability) or None if no trained model is available.
    """
    if not _load_trained_classifier() or _trained_classifier is None:
        return None

    try:
        features = np.array([[semantic_sim, geo_sim, temporal_sim]])
        prediction = _trained_classifier.predict(features)[0]
        probabilities = _trained_classifier.predict_proba(features)[0]
        class_idx = list(_trained_classifier.classes_).index(prediction)
        probability = float(probabilities[class_idx])
        return (str(prediction), probability)
    except Exception as e:
        logger.warning(f"Trained classifier prediction failed: {e}. Falling back to thresholds.")
        return None


# ---------------------------------------------------------------------------
# High-Level Pairwise Comparison
# ---------------------------------------------------------------------------


def compare_incidents(
    incident_a: Dict[str, Any],
    incident_b: Dict[str, Any],
) -> Dict[str, Any]:
    """Compare two incidents and determine their relationship.

    Each incident dict should have:
        - incident_id: str (optional)
        - description: str
        - latitude: float (optional)
        - longitude: float (optional)
        - timestamp: str or datetime (optional)
        - source: str (optional)

    Returns a dict with classification, probability, similarities, and reasoning.
    All values are computed from actual input data.
    """
    desc_a = incident_a.get("description", "") or ""
    desc_b = incident_b.get("description", "") or ""

    # 1. Semantic similarity from sentence embeddings
    sem_sim = semantic_similarity(desc_a, desc_b)

    # 2. Geographic similarity from Haversine distance
    geo_sim = geographic_similarity(
        incident_a.get("latitude"),
        incident_a.get("longitude"),
        incident_b.get("latitude"),
        incident_b.get("longitude"),
    )

    # 3. Temporal similarity from time difference
    temp_sim = temporal_similarity(
        incident_a.get("timestamp"),
        incident_b.get("timestamp"),
    )

    # 4. Combined score
    comb_score = combined_similarity(sem_sim, geo_sim, temp_sim)

    # 5. Classification — try trained model first, fall back to thresholds
    trained_result = classify_with_trained_model(sem_sim, geo_sim, temp_sim)

    if trained_result is not None:
        classification, probability = trained_result
    else:
        classification = classify_pair(comb_score)
        probability = comb_score  # Use combined score as probability estimate

    # 6. Reasoning
    reasoning = build_reasoning(sem_sim, geo_sim, temp_sim, classification)

    return {
        "incident_a_id": incident_a.get("incident_id", "unknown"),
        "incident_b_id": incident_b.get("incident_id", "unknown"),
        "classification": classification,
        "probability": round(probability, 4),
        "semantic_similarity": round(sem_sim, 4),
        "geographical_similarity": round(geo_sim, 4),
        "temporal_similarity": round(temp_sim, 4),
        "combined_score": round(comb_score, 4),
        "reasoning": reasoning,
        "model_used": (
            "trained_classifier" if trained_result is not None else "threshold_based"
        ),
    }


# ---------------------------------------------------------------------------
# Find Duplicates Against a Corpus
# ---------------------------------------------------------------------------


def find_duplicates(
    target: Dict[str, Any],
    candidates: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """Check one incident against a list of candidates and return matches.

    Returns a list of comparison results sorted by combined score descending.
    Only returns DUPLICATE and RELATED matches (not SEPARATE).
    """
    results = []
    for candidate in candidates:
        comparison = compare_incidents(target, candidate)
        if comparison["classification"] in ("DUPLICATE", "RELATED"):
            results.append(comparison)

    results.sort(key=lambda x: x["combined_score"], reverse=True)
    return results


# ---------------------------------------------------------------------------
# Incident Clustering / Consolidation
# ---------------------------------------------------------------------------


class UnionFind:
    """Disjoint-set (Union-Find) data structure for efficient clustering."""

    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # Path compression
        return self.parent[x]

    def union(self, x: int, y: int) -> None:
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return
        # Union by rank
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1


def cluster_incidents(
    incidents: List[Dict[str, Any]],
    cluster_threshold: Optional[float] = None,
) -> Dict[str, Any]:
    """Cluster multiple incident reports into groups of related/duplicate incidents.

    Uses pairwise similarity computation and Union-Find to form clusters.
    Within each cluster, the canonical incident is selected as the earliest report.

    Args:
        incidents: List of incident dicts (each with description, lat/lon, timestamp, etc.)
        cluster_threshold: Minimum combined similarity to merge two incidents.
                          Defaults to settings.RELATED_THRESHOLD.

    Returns:
        Dict with cluster assignments, canonical incidents, and pairwise similarities.
    """
    n = len(incidents)
    if n == 0:
        return {"clusters": [], "total_clusters": 0, "total_incidents": 0}

    if n == 1:
        return {
            "clusters": [
                {
                    "cluster_id": 0,
                    "canonical_incident_id": incidents[0].get("incident_id", "unknown"),
                    "incident_ids": [incidents[0].get("incident_id", "unknown")],
                    "size": 1,
                    "pairwise_similarities": [],
                }
            ],
            "total_clusters": 1,
            "total_incidents": 1,
        }

    threshold = cluster_threshold if cluster_threshold is not None else settings.RELATED_THRESHOLD

    # Batch encode all descriptions for efficiency
    descriptions = [inc.get("description", "") or "" for inc in incidents]
    embeddings = embedding_service.encode_batch(descriptions)

    # Compute pairwise similarities and build the union-find structure
    uf = UnionFind(n)
    pairwise_results: List[Dict[str, Any]] = []

    for i in range(n):
        for j in range(i + 1, n):
            # Semantic similarity via dot product of L2-normalized embeddings
            sem_sim = float(np.dot(embeddings[i], embeddings[j]))
            sem_sim = max(0.0, min(1.0, sem_sim))

            # Geographic and temporal
            geo_sim = geographic_similarity(
                incidents[i].get("latitude"),
                incidents[i].get("longitude"),
                incidents[j].get("latitude"),
                incidents[j].get("longitude"),
            )
            temp_sim = temporal_similarity(
                incidents[i].get("timestamp"),
                incidents[j].get("timestamp"),
            )

            comb = combined_similarity(sem_sim, geo_sim, temp_sim)
            classification = classify_pair(comb)

            pair_info = {
                "incident_a_id": incidents[i].get("incident_id", f"idx_{i}"),
                "incident_b_id": incidents[j].get("incident_id", f"idx_{j}"),
                "semantic_similarity": round(sem_sim, 4),
                "geographical_similarity": round(geo_sim, 4),
                "temporal_similarity": round(temp_sim, 4),
                "combined_score": round(comb, 4),
                "classification": classification,
            }
            pairwise_results.append(pair_info)

            # Merge into same cluster if above threshold
            if comb >= threshold:
                uf.union(i, j)

    # Extract clusters from union-find
    cluster_map: Dict[int, List[int]] = {}
    for i in range(n):
        root = uf.find(i)
        if root not in cluster_map:
            cluster_map[root] = []
        cluster_map[root].append(i)

    # Build cluster output
    clusters = []
    for cluster_id, (_, members) in enumerate(sorted(cluster_map.items())):
        member_ids = [incidents[m].get("incident_id", f"idx_{m}") for m in members]

        # Canonical incident: earliest timestamp, or first in list
        canonical_idx = members[0]
        earliest_ts = parse_timestamp(incidents[members[0]].get("timestamp"))

        for m in members[1:]:
            m_ts = parse_timestamp(incidents[m].get("timestamp"))
            if m_ts is not None and (earliest_ts is None or m_ts < earliest_ts):
                earliest_ts = m_ts
                canonical_idx = m

        # Get pairwise sims within this cluster
        cluster_pairs = [
            p for p in pairwise_results
            if (
                p["incident_a_id"] in member_ids
                and p["incident_b_id"] in member_ids
            )
        ]

        clusters.append({
            "cluster_id": cluster_id,
            "canonical_incident_id": incidents[canonical_idx].get("incident_id", f"idx_{canonical_idx}"),
            "incident_ids": member_ids,
            "size": len(members),
            "pairwise_similarities": cluster_pairs,
        })

    return {
        "clusters": clusters,
        "total_clusters": len(clusters),
        "total_incidents": n,
    }
