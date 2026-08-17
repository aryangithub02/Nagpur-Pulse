"""
Dedicated HTTP client for communicating with Nagpur Pulse ML Service API (/api/v1/ml/*).
Handles connection pool management, timeouts, graceful fallback, and retries.
"""

import os
import logging
import time
from typing import List, Dict, Any, Optional
import httpx

from app.services.ml.schemas import (
    SinglePredictionRequest,
    BatchPredictionRequest,
    SinglePredictionResponse,
    BatchPredictionResponse,
    JunctionRiskItem,
    AllJunctionsRiskResponse,
    HealthResponse,
    ModelInfoResponse,
)
from app.services.ml.exceptions import (
    MLServiceUnavailableException,
    MLPredictionException,
    MLValidationException,
)

logger = logging.getLogger("nagpur_pulse_ml_client")


class MLClient:
    """
    HTTP Client for ML Service API endpoints with smart offline detection caching.
    """

    def __init__(self, base_url: Optional[str] = None, timeout: Optional[float] = None):
        env_url = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
        env_timeout = float(os.getenv("ML_SERVICE_TIMEOUT", "1.0"))

        self.base_url = (base_url or env_url).rstrip("/")
        self.timeout = httpx.Timeout(timeout or env_timeout, connect=0.2)
        self._offline_until: float = 0.0

    def _is_recently_offline(self) -> bool:
        return time.time() < self._offline_until

    def _mark_offline(self):
        self._offline_until = time.time() + 10.0  # 10s offline fallback cache

    def _get_url(self, endpoint: str) -> str:
        return f"{self.base_url}{endpoint}"

    def check_health(self) -> HealthResponse:
        """
        GET /api/v1/ml/health
        Checks operational status of ML Service.
        """
        if self._is_recently_offline():
            raise MLServiceUnavailableException("ML Service is offline (cached)")

        url = self._get_url("/api/v1/ml/health")
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    return HealthResponse(**resp.json())
                self._mark_offline()
                raise MLServiceUnavailableException(f"ML Service returned HTTP status {resp.status_code}")
        except httpx.RequestError as exc:
            self._mark_offline()
            raise MLServiceUnavailableException(f"Failed to connect to ML service: {exc}")

    def get_model_info(self) -> ModelInfoResponse:
        """
        GET /api/v1/ml/model
        Retrieves ML model metadata and evaluation benchmark metrics.
        """
        if self._is_recently_offline():
            raise MLServiceUnavailableException("ML Service is offline (cached)")

        url = self._get_url("/api/v1/ml/model")
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    return ModelInfoResponse(**resp.json())
                self._mark_offline()
                raise MLPredictionException(f"Failed to retrieve model info: HTTP {resp.status_code}")
        except httpx.RequestError as exc:
            self._mark_offline()
            raise MLServiceUnavailableException(f"ML Service connection failure: {exc}")

    def predict_single(self, request: SinglePredictionRequest) -> SinglePredictionResponse:
        """
        POST /api/v1/ml/predict
        Generates risk score, level, and class probabilities for a single junction.
        """
        if self._is_recently_offline():
            return self._fallback_single_predict(request)

        url = self._get_url("/api/v1/ml/predict")
        payload = request.model_dump(exclude_none=True)
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    return SinglePredictionResponse(**resp.json())
                elif resp.status_code == 422:
                    raise MLValidationException(f"Invalid ML payload: {resp.text}")
                else:
                    self._mark_offline()
                    raise MLPredictionException(f"ML Inference error HTTP {resp.status_code}: {resp.text}")
        except httpx.RequestError as exc:
            self._mark_offline()
            return self._fallback_single_predict(request)

    def predict_batch(self, request: BatchPredictionRequest) -> BatchPredictionResponse:
        """
        POST /api/v1/ml/predict/batch
        Vectorized batch prediction across multiple junctions.
        """
        if self._is_recently_offline():
            results = [self._fallback_single_predict(item) for item in request.predictions]
            return BatchPredictionResponse(results=results)

        url = self._get_url("/api/v1/ml/predict/batch")
        payload = request.model_dump(exclude_none=True)
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.post(url, json=payload)
                if resp.status_code == 200:
                    return BatchPredictionResponse(**resp.json())
                else:
                    self._mark_offline()
                    raise MLPredictionException(f"Batch prediction error HTTP {resp.status_code}")
        except httpx.RequestError as exc:
            self._mark_offline()
            results = [self._fallback_single_predict(item) for item in request.predictions]
            return BatchPredictionResponse(results=results)

    def get_junction_risk(self, junction_id: str) -> JunctionRiskItem:
        """
        GET /api/v1/ml/risk/{junction_id}
        Retrieves latest prediction for a junction.
        """
        if self._is_recently_offline():
            single_res = self._fallback_single_predict(SinglePredictionRequest(junction_id=junction_id))
            return JunctionRiskItem(
                junction_id=junction_id,
                risk_score=single_res.prediction.risk_score,
                risk_level=single_res.prediction.risk_level,
                probabilities=single_res.prediction.probabilities,
                prediction_time=single_res.timestamp,
                model_version=single_res.model.version,
            )

        url = self._get_url(f"/api/v1/ml/risk/{junction_id}")
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    return JunctionRiskItem(**resp.json())
                self._mark_offline()
                raise MLPredictionException(f"Risk retrieval failed HTTP {resp.status_code}")
        except httpx.RequestError as exc:
            self._mark_offline()
            single_res = self._fallback_single_predict(SinglePredictionRequest(junction_id=junction_id))
            return JunctionRiskItem(
                junction_id=junction_id,
                risk_score=single_res.prediction.risk_score,
                risk_level=single_res.prediction.risk_level,
                probabilities=single_res.prediction.probabilities,
                prediction_time=single_res.timestamp,
                model_version=single_res.model.version,
            )

    def get_all_junction_risk(self) -> AllJunctionsRiskResponse:
        """
        GET /api/v1/ml/risk
        Retrieves all latest junction risk assessments.
        """
        if self._is_recently_offline():
            raise MLServiceUnavailableException("ML Service is offline (cached)")

        url = self._get_url("/api/v1/ml/risk")
        try:
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    return AllJunctionsRiskResponse(**resp.json())
                self._mark_offline()
                raise MLPredictionException(f"All risk retrieval failed HTTP {resp.status_code}")
        except httpx.RequestError as exc:
            self._mark_offline()
            raise MLServiceUnavailableException(f"ML Service connection failure: {exc}")

    def _fallback_single_predict(self, req: SinglePredictionRequest) -> SinglePredictionResponse:
        """
        Internal fallback when ML HTTP server is unreachable.
        Uses in-process ML model predictor if imported, otherwise deterministic feature heuristic.
        """
        try:
            from ml.inference.predictor import RiskPredictor
            local_predictor = RiskPredictor()
            raw_res = local_predictor.predict(req.model_dump(exclude_none=True))
            from app.services.ml.schemas import PredictionProbabilities, PredictionDetail, ModelDetail
            from datetime import datetime

            probs = PredictionProbabilities(**raw_res["probabilities"])
            detail = PredictionDetail(
                risk_level=raw_res["predicted_class"],
                risk_score=raw_res["risk_score"],
                probabilities=probs,
            )
            return SinglePredictionResponse(
                junction_id=req.junction_id,
                prediction=detail,
                model=ModelDetail(name="RandomForest", version=raw_res.get("model_version", "rf_v1")),
                timestamp=req.timestamp or datetime.utcnow().isoformat()
            )
        except Exception as err:
            logger.warning(f"In-process ML predictor fallback failed: {err}")
            from app.services.ml.schemas import PredictionProbabilities, PredictionDetail, ModelDetail
            from datetime import datetime

            level = "LOW"
            score = 15.0
            if (req.accidents_7d or 0) > 3 or (req.congestion or 0) > 80:
                level = "CRITICAL"
                score = 88.0
            elif (req.accidents_7d or 0) > 1 or (req.congestion or 0) > 60:
                level = "HIGH"
                score = 72.0
            elif (req.congestion or 0) > 40:
                level = "MEDIUM"
                score = 42.0

            probs = PredictionProbabilities(
                LOW=0.8 if level == "LOW" else 0.05,
                MEDIUM=0.8 if level == "MEDIUM" else 0.1,
                HIGH=0.8 if level == "HIGH" else 0.1,
                CRITICAL=0.8 if level == "CRITICAL" else 0.05
            )
            detail = PredictionDetail(risk_level=level, risk_score=score, probabilities=probs)
            return SinglePredictionResponse(
                junction_id=req.junction_id,
                prediction=detail,
                model=ModelDetail(name="RandomForestFallback", version="rf_v1_fallback"),
                timestamp=req.timestamp or datetime.utcnow().isoformat()
            )


# Singleton instance
ml_client = MLClient()
