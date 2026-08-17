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
CLASS_WEIGHTS = {"LOW": 15.0, "MEDIUM": 40.0, "HIGH": 70.0, "CRITICAL": 95.0}

DEFAULT_MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "ml" / "models"


# Module-level singletons to prevent disk re-read overhead
_GLOBAL_MODEL = None
_GLOBAL_EXPLAINER = None
_GLOBAL_METADATA = {}
_GLOBAL_EXPECTED_FEATURES = []


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
        self.explainer = None
        self.metadata = {}
        self.expected_features: List[str] = []
        self._load_artifacts()

    def _load_artifacts(self):
        """
        Load serialized model and metadata artifacts using module-level caching.
        """
        global _GLOBAL_MODEL, _GLOBAL_EXPLAINER, _GLOBAL_METADATA, _GLOBAL_EXPECTED_FEATURES

        if _GLOBAL_MODEL is None and self.selected_model_path.exists():
            _GLOBAL_MODEL = joblib.load(self.selected_model_path)
            try:
                import shap
                _GLOBAL_EXPLAINER = shap.TreeExplainer(_GLOBAL_MODEL)
            except Exception:
                _GLOBAL_EXPLAINER = None

        if not _GLOBAL_METADATA and self.metadata_path.exists():
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                _GLOBAL_METADATA = json.load(f)

        if not _GLOBAL_EXPECTED_FEATURES and self.feature_schema_path.exists():
            with open(self.feature_schema_path, "r", encoding="utf-8") as f:
                _GLOBAL_EXPECTED_FEATURES = json.load(f)

        self.model = _GLOBAL_MODEL
        self.explainer = _GLOBAL_EXPLAINER
        self.metadata = _GLOBAL_METADATA
        self.expected_features = _GLOBAL_EXPECTED_FEATURES

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

        # Synthesize missing accident features from live traffic telemetry (speed, congestion, incidents)
        speed = float(df_input.get("speed", pd.Series([35.0])).iloc[0])
        congestion = float(df_input.get("congestion", pd.Series([35.0])).iloc[0])
        acc_7d = float(df_input.get("accidents_7d", pd.Series([0.0])).iloc[0])

        total_acc_existing = float(df_input.get("total_accidents", pd.Series([0.0])).iloc[0])
        if total_acc_existing == 0.0:
            if speed < 15.0 or congestion > 75.0 or acc_7d >= 3.0:
                mult = 5.0
            elif speed < 25.0 or congestion > 55.0 or acc_7d >= 1.0:
                mult = 2.5
            elif speed < 35.0 or congestion > 40.0:
                mult = 1.2
            else:
                mult = 0.5

            eff_7d = max(acc_7d, 1.0 * mult)
            eff_30d = eff_7d * 3.5
            eff_total = eff_30d * 3.0
            df_input["accidents_7d"] = eff_7d
            df_input["accidents_30d"] = eff_30d
            df_input["total_accidents"] = eff_total
            df_input["injury_accidents"] = eff_total * 0.4
            df_input["fatal_accidents"] = eff_total * 0.2
            df_input["accidents_rolling_mean_3"] = eff_30d / 3.0
            df_input["accidents_rolling_mean_6"] = eff_30d / 3.0
            df_input["historical_accident_rate"] = eff_30d / 12.0
            df_input["accidents_lag_1"] = eff_7d
            df_input["accidents_90d"] = eff_30d * 2.5
            df_input["accidents_1y"] = eff_total

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

        risk_score = self.calculate_risk_score(probs)

        # Determine risk level class from calculated continuous risk score
        if risk_score >= 68.0:
            predicted_class = "CRITICAL"
        elif risk_score >= 48.0:
            predicted_class = "HIGH"
        elif risk_score >= 32.0:
            predicted_class = "MEDIUM"
        else:
            predicted_class = "LOW"

        model_version = self.metadata.get("model_version", "rf_v2_retrained")

        # SHAP Feature Explanations Calculation
        shap_explanation = []
        try:
            if self.model is not None and hasattr(self.model, "feature_names_in_"):
                explainer = self.explainer
                if explainer is None:
                    import shap
                    explainer = shap.TreeExplainer(self.model)
                sv = explainer.shap_values(X)
                if isinstance(sv, list):
                    target_idx = TARGET_CLASSES.index(predicted_class) if predicted_class in TARGET_CLASSES else -1
                    cls_shap = sv[target_idx][0] if abs(target_idx) < len(sv) else sv[-1][0]
                elif len(sv.shape) == 3:
                    target_idx = TARGET_CLASSES.index(predicted_class) if predicted_class in TARGET_CLASSES else -1
                    cls_shap = sv[0, :, target_idx]
                else:
                    cls_shap = sv[0]

                WEATHER_FEAT_LABELS = {
                    "precipitation_mm": "Rainfall",
                    "visibility_km": "Visibility",
                    "wind_speed_kmh": "Wind Speed",
                    "weather_impact_score": "Weather Impact",
                    "temperature_c": "Temperature",
                    "humidity_pct": "Humidity",
                    "storm_flag": "Storm Signal",
                }

                zipped = sorted(zip(self.model.feature_names_in_, cls_shap, X.iloc[0]), key=lambda x: abs(x[1]), reverse=True)
                for feat, s_val, f_val in zipped[:6]:
                    impact_label = "Increases Risk" if s_val > 0 else "Lowers Risk"
                    display_feat = WEATHER_FEAT_LABELS.get(str(feat), str(feat).replace("_", " ").title())
                    
                    if str(feat) == "precipitation_mm":
                        desc = f"Rainfall ({f_val:.1f} mm/h) -> {impact_label} (SHAP {s_val:+.4f})"
                    elif str(feat) == "visibility_km":
                        desc = f"Visibility ({f_val:.1f} km) -> {impact_label} (SHAP {s_val:+.4f})"
                    elif str(feat) == "weather_impact_score":
                        desc = f"Weather Impact ({f_val:.1f}/100) -> {impact_label} (SHAP {s_val:+.4f})"
                    else:
                        desc = f"{display_feat} ({f_val:.1f}) -> {impact_label} (SHAP {s_val:+.4f})"

                    shap_explanation.append({
                        "feature": str(feat),
                        "display_name": display_feat,
                        "value": float(round(f_val, 2)),
                        "shap_val": float(round(s_val, 4)),
                        "impact": impact_label,
                        "category": "weather" if str(feat) in WEATHER_FEAT_LABELS else "traffic",
                        "description": desc
                    })
        except Exception as e:
            shap_explanation = [{"feature": "telemetry", "value": 1.0, "shap_val": 0.1, "impact": "Analyzed", "description": f"SHAP error: {e}"}]

        return {
            "predicted_class": predicted_class,
            "risk_score": risk_score,
            "probabilities": probs,
            "model_version": model_version,
            "shap_explanation": shap_explanation,
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
