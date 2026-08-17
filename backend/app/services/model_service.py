import logging
import os
from typing import Any, Dict, Optional

from app.schemas.prediction import PredictionResponse

logger = logging.getLogger("model_service")


class ModelLoadingError(Exception):
    """Raised when loading the ML model fails."""
    pass


class ModelPredictionError(Exception):
    """Raised when running model inference fails."""
    pass


class ModelNotFoundError(Exception):
    """Raised when the configured model file is missing and mock fallback is disabled."""
    pass


class _MockModelAdapter:
    """Isolated, development-only mock adapter for API verification before the final model artifact arrives.
    
    NEVER present mock outputs as real ML predictions.
    """
    def predict(self, features: Dict[str, Any]) -> PredictionResponse:
        # Development mock prediction: deterministic mock response clearly labeled
        return PredictionResponse(
            success=True,
            prediction=1,
            probability=0.85,
            is_mock=True,
            message="DEVELOPMENT MOCK MODEL: Real ML model artifact not found. Provide trained artifact at MODEL_PATH."
        )


class ModelService:
    """Service layer managing single-instance model loading and prediction inference."""
    
    def __init__(self):
        self._model: Optional[Any] = None
        self._model_path: str = ""
        self._is_loaded: bool = False
        self._is_mock: bool = False
        self._load_error: Optional[str] = None

    def load_model(self) -> None:
        """Loads the trained ML model artifact once into memory at application boot.
        
        Reads MODEL_PATH from environment (defaulting to app/ml/model.joblib).
        If the file is not found and ENABLE_MOCK_FALLBACK is True, falls back to _MockModelAdapter.
        """
        if self._is_loaded and self._model is not None:
            return

        model_path = os.getenv("MODEL_PATH", "app/ml/model.joblib")
        enable_mock = os.getenv("ENABLE_MOCK_FALLBACK", "true").lower() in ("true", "1", "t", "yes")

        # Resolve path relative to backend root if relative
        if not os.path.isabs(model_path):
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            resolved_path = os.path.join(base_dir, model_path)
        else:
            resolved_path = model_path

        self._model_path = resolved_path

        if os.path.exists(resolved_path):
            try:
                import joblib
                self._model = joblib.load(resolved_path)
                self._is_loaded = True
                self._is_mock = False
                logger.info(f"Successfully loaded trained ML model from '{resolved_path}'")
            except Exception as e:
                self._load_error = f"Failed to load model file '{resolved_path}': {str(e)}"
                logger.error(self._load_error)
                if enable_mock:
                    logger.warning("Falling back to isolated development _MockModelAdapter")
                    self._model = _MockModelAdapter()
                    self._is_loaded = True
                    self._is_mock = True
                else:
                    self._is_loaded = False
                    raise ModelLoadingError(self._load_error)
        else:
            msg = f"Model artifact not found at path '{resolved_path}'."
            logger.warning(msg)
            if enable_mock:
                logger.warning("Using isolated development _MockModelAdapter until final model artifact is delivered.")
                self._model = _MockModelAdapter()
                self._is_loaded = True
                self._is_mock = True
            else:
                self._load_error = msg
                self._is_loaded = False
                raise ModelNotFoundError(msg)

    def predict(self, features: Dict[str, Any]) -> PredictionResponse:
        """Consumes feature dictionary and returns a PredictionResponse.
        
        Clean interface: rest of backend does not depend on internal ML implementation.
        """
        if not self._is_loaded or self._model is None:
            try:
                self.load_model()
            except Exception as e:
                raise ModelLoadingError(f"Model service unavailable: {str(e)}")

        if self._is_mock:
            return self._model.predict(features)

        try:
            import numpy as np

            # Handle dict inputs for scikit-learn / joblib models
            # Standard models accept 2D array or dict list
            if hasattr(self._model, "predict"):
                # Attempt to pass list of values or dict if dict vectorizer used
                try:
                    # Case 1: Model accepts feature list/values
                    feature_values = [list(features.values())]
                    raw_pred = self._model.predict(feature_values)
                except Exception:
                    # Case 2: Model accepts dict directly
                    raw_pred = self._model.predict([features])
            else:
                raise ModelPredictionError("Loaded model object does not expose a predict method")

            # Extract scalar prediction
            if hasattr(raw_pred, "tolist"):
                pred_val = raw_pred.tolist()[0]
            elif isinstance(raw_pred, (list, tuple)):
                pred_val = raw_pred[0]
            else:
                pred_val = raw_pred

            # Check for predict_proba without fabricating scores
            proba_val: Optional[float] = None
            if hasattr(self._model, "predict_proba"):
                try:
                    try:
                        feature_values = [list(features.values())]
                        raw_proba = self._model.predict_proba(feature_values)
                    except Exception:
                        raw_proba = self._model.predict_proba([features])
                        
                    if hasattr(raw_proba, "shape") and len(raw_proba.shape) == 2:
                        proba_val = float(np.max(raw_proba[0]))
                except Exception as proba_err:
                    logger.debug(f"predict_proba omitted: {proba_err}")

            return PredictionResponse(
                success=True,
                prediction=pred_val,
                probability=proba_val,
                is_mock=False
            )
        except Exception as e:
            logger.error(f"Prediction execution error: {str(e)}")
            raise ModelPredictionError(f"Error executing prediction: {str(e)}")


# Global singleton instance
model_service = ModelService()
