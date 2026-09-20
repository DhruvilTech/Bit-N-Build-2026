"""Training pipeline for the Duplicate Incident Detection Classifier.

Trains a logistic regression model on features extracted from the synthetic
incident dataset:
  - Semantic similarity (cosine similarity of sentence embeddings)
  - Geographic similarity (Haversine + exponential decay)
  - Temporal similarity (exponential decay)

The classifier learns optimal decision boundaries for DUPLICATE/RELATED/SEPARATE
from the training data, rather than relying on manually chosen thresholds.

Usage:
    cd AI
    python -m scripts.train_duplicate_model
"""

import json
import os
import sys
import time
from datetime import datetime, timezone
from typing import Dict, List, Any, Tuple

import numpy as np

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

AI_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATASET_PATH = os.path.join(AI_ROOT, "datasets", "synthetic_incidents.json")
MODELS_DIR = os.path.join(AI_ROOT, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "duplicate_classifier.joblib")
EVAL_PATH = os.path.join(MODELS_DIR, "duplicate_classifier_eval.json")


def load_dataset() -> Dict[str, Any]:
    """Load the synthetic incident dataset."""
    if not os.path.exists(DATASET_PATH):
        raise FileNotFoundError(
            f"Dataset not found at {DATASET_PATH}. "
            f"Run 'python -m scripts.generate_synthetic_incidents' first."
        )
    with open(DATASET_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_features(
    pairs: List[Dict[str, Any]],
    model,
) -> Tuple[np.ndarray, np.ndarray]:
    """Extract feature vectors and labels from incident pairs.

    Features per pair:
        [semantic_similarity, geographic_similarity, temporal_similarity]

    Uses the actual embedding model and the same similarity functions
    that will be used at inference time.
    """
    # Import similarity functions (same as used in production inference)
    sys.path.insert(0, AI_ROOT)
    from app.services.duplicate_detector import (
        geographic_similarity,
        temporal_similarity,
    )

    print(f"  Encoding {len(pairs) * 2} incident descriptions...")
    start = time.time()

    # Batch encode all descriptions
    all_descriptions = []
    for pair in pairs:
        all_descriptions.append(pair["incident_a"].get("description", ""))
        all_descriptions.append(pair["incident_b"].get("description", ""))

    all_embeddings = model.encode(
        all_descriptions,
        convert_to_numpy=True,
        normalize_embeddings=True,
        batch_size=64,
        show_progress_bar=True,
    )

    encode_time = time.time() - start
    print(f"  Encoding completed in {encode_time:.1f}s")

    features = []
    labels = []

    for i, pair in enumerate(pairs):
        emb_a = all_embeddings[i * 2]
        emb_b = all_embeddings[i * 2 + 1]

        # Semantic similarity (dot product of L2-normalized vectors = cosine sim)
        sem_sim = float(np.dot(emb_a, emb_b))
        sem_sim = max(0.0, min(1.0, sem_sim))

        # Geographic similarity
        geo_sim = geographic_similarity(
            pair["incident_a"].get("latitude"),
            pair["incident_a"].get("longitude"),
            pair["incident_b"].get("latitude"),
            pair["incident_b"].get("longitude"),
        )

        # Temporal similarity
        temp_sim = temporal_similarity(
            pair["incident_a"].get("timestamp"),
            pair["incident_b"].get("timestamp"),
        )

        features.append([sem_sim, geo_sim, temp_sim])
        labels.append(pair["label"])

    return np.array(features), np.array(labels)


def train_and_evaluate():
    """Full training pipeline: load data → extract features → train → evaluate → save."""
    from sentence_transformers import SentenceTransformer
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import (
        classification_report,
        confusion_matrix,
        f1_score,
        precision_score,
        recall_score,
    )
    import joblib

    print("=" * 60)
    print("PS-9 Duplicate Detection — Model Training Pipeline")
    print("=" * 60)

    # 1. Load dataset
    print("\n[1/6] Loading dataset...")
    dataset = load_dataset()
    meta = dataset["metadata"]
    print(f"  Total pairs: {meta['total_pairs']}")
    print(f"  Labels: {meta['label_distribution']}")
    print(f"  Train: {meta['splits']['train']} | Val: {meta['splits']['validation']} | Test: {meta['splits']['test']}")

    train_pairs = dataset["train"]
    val_pairs = dataset["validation"]
    test_pairs = dataset["test"]

    # 2. Load embedding model
    print("\n[2/6] Loading sentence-transformers model...")
    embedding_model_name = os.environ.get("EMBEDDING_MODEL_NAME", "all-MiniLM-L6-v2")
    print(f"  Model: {embedding_model_name}")
    model = SentenceTransformer(embedding_model_name)
    probe = model.encode(["probe"], convert_to_numpy=True)
    print(f"  Embedding dimension: {probe.shape[1]}")

    # 3. Extract features
    print("\n[3/6] Extracting features from training set...")
    X_train, y_train = extract_features(train_pairs, model)
    print(f"  Training features shape: {X_train.shape}")

    print("\n  Extracting features from validation set...")
    X_val, y_val = extract_features(val_pairs, model)
    print(f"  Validation features shape: {X_val.shape}")

    print("\n  Extracting features from test set...")
    X_test, y_test = extract_features(test_pairs, model)
    print(f"  Test features shape: {X_test.shape}")

    # 4. Train logistic regression
    print("\n[4/6] Training logistic regression classifier...")
    classifier = LogisticRegression(
        solver="lbfgs",
        max_iter=1000,
        class_weight="balanced",  # Handle any class imbalance
        random_state=42,
    )
    classifier.fit(X_train, y_train)
    print("  Training complete.")

    # 5. Evaluate
    print("\n[5/6] Evaluating model...")

    def evaluate_split(X, y, split_name):
        y_pred = classifier.predict(X)
        report = classification_report(y, y_pred, output_dict=True, zero_division=0)
        cm = confusion_matrix(y, y_pred, labels=["DUPLICATE", "RELATED", "SEPARATE"])

        print(f"\n  --- {split_name} Results ---")
        print(classification_report(y, y_pred, zero_division=0))
        print(f"  Confusion Matrix ({split_name}):")
        print(f"  Labels: DUPLICATE, RELATED, SEPARATE")
        for row_label, row in zip(["DUPLICATE", "RELATED", "SEPARATE"], cm):
            print(f"    {row_label:12s}: {row}")

        macro_f1 = f1_score(y, y_pred, average="macro", zero_division=0)
        weighted_f1 = f1_score(y, y_pred, average="weighted", zero_division=0)

        return {
            "classification_report": report,
            "confusion_matrix": cm.tolist(),
            "macro_f1": round(float(macro_f1), 4),
            "weighted_f1": round(float(weighted_f1), 4),
            "sample_count": len(y),
        }

    train_eval = evaluate_split(X_train, y_train, "Training")
    val_eval = evaluate_split(X_val, y_val, "Validation")
    test_eval = evaluate_split(X_test, y_test, "Test")

    # Feature importance analysis
    print("\n  Feature Weights (Logistic Regression Coefficients):")
    feature_names = ["semantic_similarity", "geographic_similarity", "temporal_similarity"]
    for cls_idx, cls_name in enumerate(classifier.classes_):
        weights = classifier.coef_[cls_idx]
        print(f"    {cls_name}:")
        for fname, w in zip(feature_names, weights):
            print(f"      {fname}: {w:.4f}")

    # Check if dataset is too small for meaningful evaluation
    n_test = len(y_test)
    stats_warning = None
    if n_test < 30:
        stats_warning = (
            f"WARNING: Test set has only {n_test} samples. "
            f"Evaluation metrics may not be statistically meaningful. "
            f"Consider generating a larger synthetic dataset."
        )
        print(f"\n  ⚠️  {stats_warning}")

    # 6. Save model and evaluation report
    print("\n[6/6] Saving model and evaluation report...")
    os.makedirs(MODELS_DIR, exist_ok=True)

    joblib.dump(classifier, MODEL_PATH)
    print(f"  Model saved to: {MODEL_PATH}")

    eval_report = {
        "model_type": "LogisticRegression",
        "embedding_model": embedding_model_name,
        "embedding_dim": int(probe.shape[1]),
        "features": feature_names,
        "training_samples": len(y_train),
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "classes": list(classifier.classes_),
        "coefficients": {
            cls_name: {fname: round(float(w), 6) for fname, w in zip(feature_names, classifier.coef_[cls_idx])}
            for cls_idx, cls_name in enumerate(classifier.classes_)
        },
        "intercepts": {
            cls_name: round(float(classifier.intercept_[cls_idx]), 6)
            for cls_idx, cls_name in enumerate(classifier.classes_)
        },
        "evaluation": {
            "train": train_eval,
            "validation": val_eval,
            "test": test_eval,
        },
        "statistics_warning": stats_warning,
        "dataset_metadata": meta,
    }

    with open(EVAL_PATH, "w", encoding="utf-8") as f:
        json.dump(eval_report, f, indent=2, ensure_ascii=False)
    print(f"  Evaluation report saved to: {EVAL_PATH}")

    print("\n" + "=" * 60)
    print("Training pipeline complete!")
    print(f"  Test Macro F1: {test_eval['macro_f1']}")
    print(f"  Test Weighted F1: {test_eval['weighted_f1']}")
    print("=" * 60)


if __name__ == "__main__":
    train_and_evaluate()
