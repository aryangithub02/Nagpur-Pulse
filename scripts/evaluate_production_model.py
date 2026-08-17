"""Evaluate production calibrated XGBoost model on held-out test set."""
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from src.config import CONFIDENCE_THRESHOLD, FEATURES
from src.model_loader import load_model
from src.predictor import predict_risk

TEST_PATH = ROOT / "data" / "processed" / "test.csv"
TARGET = "risk_level"
CLASS_NAMES = ["LOW", "MEDIUM", "HIGH"]


def main():
    print("=" * 70)
    print("NAGPUR PULSE - PRODUCTION MODEL EVALUATION")
    print("=" * 70)

    load_model()
    test_df = pd.read_csv(TEST_PATH)
    test_df = test_df.dropna(subset=[TARGET])

    y_true = test_df[TARGET].values
    y_raw = []  # argmax without confidence gate
    y_prod = []  # production output including UNCERTAIN
    y_conf = []
    latencies_ms = []

    import time
    from src.model_loader import load_model as _load
    from src.predictor import prepare_input, get_probability_mapping

    model = _load()

    for _, row in test_df.iterrows():
        payload = {f: row[f] for f in FEATURES}

        t0 = time.perf_counter()
        result = predict_risk(payload)
        latencies_ms.append((time.perf_counter() - t0) * 1000)

        y_prod.append(result["risk_level"])
        y_conf.append(result["confidence"])

        X = prepare_input(payload)
        probs = model.predict_proba(X)[0]
        mapping = get_probability_mapping(model, probs)
        y_raw.append(max(mapping, key=mapping.get))

    y_raw = np.array(y_raw)
    y_prod = np.array(y_prod)
    uncertain_count = (y_prod == "UNCERTAIN").sum()

    def print_metrics(label, y_pred, exclude_uncertain=False):
        mask = np.ones(len(y_true), dtype=bool)
        if exclude_uncertain:
            mask = y_pred != "UNCERTAIN"
            y_p = y_pred[mask]
            y_t = y_true[mask]
        else:
            y_p = y_pred
            y_t = y_true

        print(f"\n--- {label} ---")
        if exclude_uncertain:
            print(f"Evaluated samples: {mask.sum()} (excluded {(~mask).sum()} UNCERTAIN)")
        print(f"Accuracy:           {accuracy_score(y_t, y_p):.4f}")
        print(f"Precision (weighted): {precision_score(y_t, y_p, average='weighted', zero_division=0):.4f}")
        print(f"Recall (weighted):    {recall_score(y_t, y_p, average='weighted', zero_division=0):.4f}")
        print(f"F1 (weighted):        {f1_score(y_t, y_p, average='weighted', zero_division=0):.4f}")
        hp = precision_score(y_t, y_p, labels=["HIGH"], average="macro", zero_division=0)
        hr = recall_score(y_t, y_p, labels=["HIGH"], average="macro", zero_division=0)
        hf = f1_score(y_t, y_p, labels=["HIGH"], average="macro", zero_division=0)
        print(f"HIGH precision: {hp:.4f}  {'PASS' if hp >= 0.9 else 'FAIL (target 90%)'}")
        print(f"HIGH recall:    {hr:.4f}")
        print(f"HIGH F1:        {hf:.4f}")
        cm = confusion_matrix(y_t, y_p, labels=CLASS_NAMES)
        print(f"Confusion matrix (rows=true, cols=pred):")
        print(f"{'':>8}  " + "  ".join(f"pred_{c:>6}" for c in CLASS_NAMES))
        for i, cls in enumerate(CLASS_NAMES):
            print(f"true_{cls:>6}  " + "  ".join(f"{cm[i,j]:>6}" for j in range(3)))

    print(f"\nTest samples: {len(y_true)}")
    print(f"Confidence threshold: {CONFIDENCE_THRESHOLD}")
    print(f"UNCERTAIN predictions: {uncertain_count} ({100*uncertain_count/len(y_true):.1f}%)")
    print(f"Mean confidence: {np.mean(y_conf):.4f}")
    print(f"Median confidence: {np.median(y_conf):.4f}")
    print(f"Prediction latency: mean={np.mean(latencies_ms):.1f}ms, p95={np.percentile(latencies_ms, 95):.1f}ms, max={np.max(latencies_ms):.1f}ms")

    print("\n--- Class Distribution (actual) ---")
    for cls in CLASS_NAMES:
        count = (y_true == cls).sum()
        print(f"  {cls}: {count} ({100*count/len(y_true):.1f}%)")

    print_metrics("Raw Model (argmax, no confidence gate)", y_raw)
    print_metrics("Production (with UNCERTAIN gate)", y_prod, exclude_uncertain=True)

    prod_counts = {}
    for v in list(y_prod) + ["_total"]:
        pass
    from collections import Counter
    counts = Counter(y_prod)
    print("\n--- Production Prediction Distribution ---")
    for k in ["LOW", "MEDIUM", "HIGH", "UNCERTAIN"]:
        v = counts.get(k, 0)
        print(f"  {k}: {v} ({100*v/len(y_true):.1f}%)")


if __name__ == "__main__":
    main()
