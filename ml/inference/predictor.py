"""
Inference Interface Engine for Nagpur Pulse ML Service.
Exposes clean predict(features) interface for model inference, class probabilities,
and continuous risk score calculation.
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Union, Optional
import pandas as pd
import numpy as np
import joblib

# Target class label mapping
TARGET_CLASSES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
CLASS_WEIGHTS = {"LOW": 0.0, "MEDIUM": 35.0, "HIGH": 70.0, "CRITICAL": 100.0}

DEFAULT_MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "ml" / "models"


class RiskPredictor:
    """
    Production-ready Risk Predictor exposing predict() for traffic risk classification.
    """

    def __init__(self, model_dir: Optional[Path] = None):
        self.model_dir = Path(model_dir) if model_dir else DEFAULT_MODEL_DIR
        self.selected_model_path = self.model_dir / "selected_model.pkl"
        self.metadata_path = self.model_dir / "model_metadata.json"
        self.feature_schema_path = self.model_dir / "feature_schema.json"

        self.model = None
        self.metadata = {}
        self.expected_features: List[str] = []
        self._load_artifacts()

    def _load_artifacts(self):
        """
        Load serialized model and metadata artifacts.
        """
        if self.selected_model_path.exists():
            self.model = joblib.load(self.selected_model_path)
        else:
            self.model = None

        if self.metadata_path.exists():
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

        if self.feature_schema_path.exists():
            with open(self.feature_schema_path, "r", encoding="utf-8") as f:
                self.expected_features = json.load(f)

    def calculate_risk_score(self, probs: Dict[str, float]) -> float:
        """
        Convert class probabilities into a continuous numerical risk score (0.0 to 100.0).
        risk_score = P(LOW)*0 + P(MEDIUM)*35 + P(HIGH)*70 + P(CRITICAL)*100
        """
        score = sum(float(probs.get(cls, 0.0)) * CLASS_WEIGHTS[cls] for cls in TARGET_CLASSES)
        return round(float(np.clip(score, 0.0, 100.0)), 2)

    def predict(self, features: Union[Dict[str, Any], pd.DataFrame, pd.Series]) -> Dict[str, Any]:
        """
        Predict traffic risk level, probabilities, and continuous risk score for a feature vector.
        """
        # Convert input to DataFrame row
        if isinstance(features, dict):
            df_input = pd.DataFrame([features])
        elif isinstance(features, pd.Series):
            df_input = pd.DataFrame([features.to_dict()])
        elif isinstance(features, pd.DataFrame):
            df_input = features.copy()
        else:
            raise ValueError("Features must be a dictionary, pandas Series, or DataFrame.")

        # Ensure all expected feature columns exist
        if self.expected_features:
            for col in self.expected_features:
                if col not in df_input.columns:
                    df_input[col] = 0.0
            X = df_input[self.expected_features].copy()
        else:
            num_cols = df_input.select_dtypes(include=[np.number]).columns
            X = df_input[num_cols].copy()

        # Fallback heuristic predictor if model not yet trained
        if self.model is None:
            # Deterministic heuristic based on lag features
            acc = float(X.get("accidents_lag_1", pd.Series([0])).iloc[0])
            if acc >= 4:
                probs = {"LOW": 0.05, "MEDIUM": 0.15, "HIGH": 0.30, "CRITICAL": 0.50}
            elif acc >= 2:
                probs = {"LOW": 0.10, "MEDIUM": 0.20, "HIGH": 0.60, "CRITICAL": 0.10}
            elif acc >= 1:
                probs = {"LOW": 0.30, "MEDIUM": 0.50, "HIGH": 0.15, "CRITICAL": 0.05}
            else:
                probs = {"LOW": 0.85, "MEDIUM": 0.10, "HIGH": 0.04, "CRITICAL": 0.01}
        else:
            # Model prediction
            if hasattr(self.model, "predict_proba"):
                raw_probs = self.model.predict_proba(X)[0]
                classes = getattr(self.model, "classes_", list(range(len(raw_probs))))
                probs = {}
                for i, cls_idx in enumerate(classes):
                    cls_name = TARGET_CLASSES[cls_idx] if isinstance(cls_idx, (int, np.integer)) and cls_idx < len(TARGET_CLASSES) else str(cls_idx)
                    probs[cls_name] = round(float(raw_probs[i]), 4)
                
                # Normalize probabilities to sum to 1.0
                total_p = sum(probs.values())
                if total_p > 0:
                    probs = {k: round(v / total_p, 4) for k, v in probs.items()}
            else:
                pred_cls_idx = self.model.predict(X)[0]
                pred_cls = TARGET_CLASSES[pred_cls_idx] if isinstance(pred_cls_idx, int) else str(pred_cls_idx)
                probs = {cls: (1.0 if cls == pred_cls else 0.0) for cls in TARGET_CLASSES}

        # Determine max probability predicted class
        predicted_class = max(probs, key=probs.get)
        risk_score = self.calculate_risk_score(probs)

        # High / Critical sensitivity threshold override
        high_prob = probs.get("HIGH", 0.0)
        critical_prob = probs.get("CRITICAL", 0.0)
        if critical_prob >= 0.35:
            predicted_class = "CRITICAL"
        elif high_prob + critical_prob >= 0.45 and predicted_class == "LOW":
            predicted_class = "HIGH"

        model_version = self.metadata.get("model_version", "xgb_v1")

        return {
            "predicted_class": predicted_class,
            "risk_score": risk_score,
            "probabilities": probs,
            "model_version": model_version,
        }

    @staticmethod
    def predict_sample() -> Dict[str, Any]:
        """
        Utility method to run inference on a sample record.
        """
        predictor = RiskPredictor()
        sample_features = {
            "month": 7,
            "accidents_lag_1": 2,
            "accidents_rolling_mean_3": 1.67,
            "distance_to_city_center": 3.4,
            "month_sin": -0.5,
            "month_cos": -0.866,
        }
        return predictor.predict(sample_features)
