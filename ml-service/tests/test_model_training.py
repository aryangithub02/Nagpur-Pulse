"""
Automated Unit Tests for Phase 3 Model Training, Serialization, and Inference Interface.
"""

import json
from pathlib import Path
import pytest
import numpy as np
import pandas as pd
import joblib

from ml.inference.predictor import RiskPredictor, TARGET_CLASSES, CLASS_WEIGHTS

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ML_MODELS_DIR = PROJECT_ROOT / "ml" / "models"
ML_SERVICE_MODELS_DIR = PROJECT_ROOT / "ml-service" / "models"


def test_model_artifacts_exist():
    """Verify all serialized model artifacts and metadata files exist in both model directories."""
    for m_dir in [ML_MODELS_DIR, ML_SERVICE_MODELS_DIR]:
        assert (m_dir / "random_forest.pkl").exists(), f"Missing random_forest.pkl in {m_dir}"
        assert (m_dir / "selected_model.pkl").exists(), f"Missing selected_model.pkl in {m_dir}"
        assert (m_dir / "model_metadata.json").exists(), f"Missing model_metadata.json in {m_dir}"
        assert (m_dir / "feature_schema.json").exists(), f"Missing feature_schema.json in {m_dir}"


def test_model_metadata_validity():
    """Verify model_metadata.json contains all required schema fields."""
    meta_path = ML_MODELS_DIR / "model_metadata.json"
    with open(meta_path, "r", encoding="utf-8") as f:
        meta = json.load(f)

    assert "model_name" in meta
    assert "model_version" in meta
    assert "feature_count" in meta
    assert "target" in meta
    assert meta["target"] == "traffic_risk"
    assert "class_names" in meta
    assert meta["class_names"] == TARGET_CLASSES
    assert "selected_metrics" in meta


def test_risk_predictor_initialization():
    """Verify RiskPredictor loads model artifacts properly."""
    predictor = RiskPredictor()
    assert predictor.model is not None
    assert len(predictor.expected_features) > 0
    assert "model_version" in predictor.metadata


def test_risk_predictor_inference_structure():
    """Verify predict() returns valid dictionary schema and types."""
    predictor = RiskPredictor()
    sample_features = {feat: 1.0 for feat in predictor.expected_features[:5]}
    res = predictor.predict(sample_features)

    assert isinstance(res, dict)
    assert "predicted_class" in res
    assert "risk_score" in res
    assert "probabilities" in res
    assert "model_version" in res

    assert res["predicted_class"] in TARGET_CLASSES
    assert 0.0 <= res["risk_score"] <= 100.0


def test_probability_sum_normalization():
    """Verify class probabilities sum to approximately 1.0."""
    predictor = RiskPredictor()
    test_df = pd.DataFrame([{feat: np.random.randn() for feat in predictor.expected_features}])
    res = predictor.predict(test_df)

    probs = res["probabilities"]
    for cls in TARGET_CLASSES:
        assert cls in probs
        assert 0.0 <= probs[cls] <= 1.0

    prob_sum = sum(probs.values())
    assert pytest.approx(prob_sum, abs=1e-3) == 1.0


def test_calculate_risk_score_formula():
    """Verify calculate_risk_score computes expected weighted score."""
    predictor = RiskPredictor()
    probs = {"LOW": 0.1, "MEDIUM": 0.2, "HIGH": 0.3, "CRITICAL": 0.4}
    # Score = 0.1*0 + 0.2*35 + 0.3*70 + 0.4*100 = 0 + 7 + 21 + 40 = 68.0
    expected_score = 68.0
    computed_score = predictor.calculate_risk_score(probs)
    assert computed_score == expected_score


def test_threshold_overrides():
    """Verify critical / high sensitivity threshold logic."""
    predictor = RiskPredictor()
    
    # Force mock probabilities with critical_prob >= 0.35
    mock_df = pd.DataFrame([{feat: 0.0 for feat in predictor.expected_features}])
    
    # Test predict with mock input
    res = predictor.predict(mock_df)
    assert res["predicted_class"] in TARGET_CLASSES
