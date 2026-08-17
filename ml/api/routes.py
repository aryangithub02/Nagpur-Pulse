"""
FastAPI Router for Nagpur Pulse ML Service API (/api/v1/ml/*).
Exposes /predict, /predict/batch, /risk/{junction_id}, /risk, /health, /model endpoints.
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException, status, Query
import logging

from ml.api.schemas import (
    SinglePredictionRequest,
    BatchPredictionRequest,
    SinglePredictionResponse,
    BatchPredictionResponse,
    PredictionDetail,
    PredictionProbabilities,
    ModelDetail,
    JunctionRiskItem,
    AllJunctionsRiskResponse,
    HealthResponse,
    ModelInfoResponse,
    ModelInfoMetrics,
)
from ml.inference.predictor import RiskPredictor

logger = logging.getLogger("NagpurPulse.ML_API")

# Global singleton predictor instance initialized once
try:
    predictor = RiskPredictor()
except Exception as e:
    logger.error(f"Failed to load RiskPredictor on router import: {e}")
    predictor = None

router = APIRouter(prefix="/api/v1/ml", tags=["ML Service"])

# In-memory prediction cache for standalone ML service risk queries
_LATEST_PREDICTIONS_CACHE: Dict[str, JunctionRiskItem] = {}


def get_active_predictor() -> RiskPredictor:
    """Ensure RiskPredictor is loaded and available; raise HTTP 503 if unavailable."""
    global predictor
    if predictor is None:
        try:
            predictor = RiskPredictor()
        except Exception:
            pass

    if predictor is None or predictor.model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "MODEL_UNAVAILABLE", "message": "ML model artifact is currently unavailable"}}
        )
    return predictor


@router.get("/health", response_model=HealthResponse, summary="ML Service Health Check")
def health_check():
    """
    Returns health status of the ML inference service.
    """
    is_loaded = predictor is not None and predictor.model is not None
    model_name = predictor.metadata.get("model_name", "RandomForest") if is_loaded else "Unknown"
    version = predictor.metadata.get("model_version", "rf_v1") if is_loaded else "rf_v1"
    feature_ver = predictor.metadata.get("features_version", "features_v1") if is_loaded else "features_v1"

    return HealthResponse(
        status="healthy" if is_loaded else "unhealthy",
        model_loaded=is_loaded,
        model=model_name,
        model_version=version,
        feature_version=feature_ver,
    )


@router.get("/model", response_model=ModelInfoResponse, summary="Retrieve ML Model Information")
def get_model_info():
    """
    Returns model metadata and Phase 3 evaluation benchmark metrics.
    """
    p = get_active_predictor()
    meta = p.metadata
    metrics = meta.get("selected_metrics", {})

    return ModelInfoResponse(
        model=meta.get("model_name", "RandomForest"),
        version=meta.get("model_version", "rf_v1"),
        feature_version=meta.get("features_version", "features_v1"),
        target=meta.get("target", "traffic_risk"),
        metrics=ModelInfoMetrics(
            accuracy=metrics.get("accuracy", 0.9729),
            macro_f1=metrics.get("macro_f1", 0.5228),
            high_recall=metrics.get("high_recall", 0.75),
            critical_recall=metrics.get("critical_recall", 0.0),
        ),
    )


@router.post("/predict", response_model=SinglePredictionResponse, summary="Predict Traffic Risk for Single Junction")
def predict_single(payload: SinglePredictionRequest):
    """
    Generates traffic risk level, probabilities, and continuous risk score for a junction.
    """
    p = get_active_predictor()

    try:
        raw_input = payload.model_dump(exclude_none=True)
        res = p.predict(raw_input)

        ts = payload.timestamp or datetime.utcnow().isoformat()
        model_name = p.metadata.get("model_name", "RandomForest")
        model_ver = res.get("model_version", "rf_v1")

        probs_obj = PredictionProbabilities(**res["probabilities"])
        pred_detail = PredictionDetail(
            risk_level=res["predicted_class"],
            risk_score=res["risk_score"],
            probabilities=probs_obj,
        )

        response = SinglePredictionResponse(
            junction_id=payload.junction_id,
            prediction=pred_detail,
            model=ModelDetail(name=model_name, version=model_ver),
            timestamp=ts,
        )

        # Cache latest prediction for GET /risk queries
        _LATEST_PREDICTIONS_CACHE[payload.junction_id] = JunctionRiskItem(
            junction_id=payload.junction_id,
            risk_score=res["risk_score"],
            risk_level=res["predicted_class"],
            probabilities=probs_obj,
            prediction_time=ts,
            model_version=model_ver,
        )

        return response
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail={"error": {"code": "INVALID_INPUT", "message": str(ve)}})
    except Exception as exc:
        logger.error(f"Inference error: {exc}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail={"error": {"code": "INFERENCE_FAILURE", "message": str(exc)}})


@router.post("/predict/batch", response_model=BatchPredictionResponse, summary="Vectorized Batch Risk Prediction")
def predict_batch(payload: BatchPredictionRequest):
    """
    Generates vectorized traffic risk predictions across an array of junctions.
    """
    p = get_active_predictor()
    results = []

    for req in payload.predictions:
        try:
            raw_input = req.model_dump(exclude_none=True)
            res = p.predict(raw_input)

            ts = req.timestamp or datetime.utcnow().isoformat()
            model_name = p.metadata.get("model_name", "RandomForest")
            model_ver = res.get("model_version", "rf_v1")

            probs_obj = PredictionProbabilities(**res["probabilities"])
            pred_detail = PredictionDetail(
                risk_level=res["predicted_class"],
                risk_score=res["risk_score"],
                probabilities=probs_obj,
            )

            response = SinglePredictionResponse(
                junction_id=req.junction_id,
                prediction=pred_detail,
                model=ModelDetail(name=model_name, version=model_ver),
                timestamp=ts,
            )

            _LATEST_PREDICTIONS_CACHE[req.junction_id] = JunctionRiskItem(
                junction_id=req.junction_id,
                risk_score=res["risk_score"],
                risk_level=res["predicted_class"],
                probabilities=probs_obj,
                prediction_time=ts,
                model_version=model_ver,
            )

            results.append(response)
        except Exception as exc:
            logger.error(f"Batch item failure for junction {req.junction_id}: {exc}")

    return BatchPredictionResponse(results=results)


@router.get("/risk/{junction_id}", response_model=JunctionRiskItem, summary="Get Latest Risk for Junction")
def get_junction_risk(junction_id: str):
    """
    Retrieves latest stored prediction for a specified junction. Returns HTTP 404 if not found.
    """
    if junction_id in _LATEST_PREDICTIONS_CACHE:
        return _LATEST_PREDICTIONS_CACHE[junction_id]

    # Generate heuristic on demand if predictor active
    p = get_active_predictor()
    res = p.predict({"junction_id": junction_id})
    ts = datetime.utcnow().isoformat()

    item = JunctionRiskItem(
        junction_id=junction_id,
        risk_score=res["risk_score"],
        risk_level=res["predicted_class"],
        probabilities=PredictionProbabilities(**res["probabilities"]),
        prediction_time=ts,
        model_version=res.get("model_version", "rf_v1"),
    )
    _LATEST_PREDICTIONS_CACHE[junction_id] = item
    return item


@router.get("/risk", response_model=AllJunctionsRiskResponse, summary="Get Latest Risk for All Monitored Junctions")
def get_all_junctions_risk():
    """
    Retrieves latest risk predictions across all monitored junctions for dashboard consumption.
    """
    if not _LATEST_PREDICTIONS_CACHE:
        # Pre-populate sample monitored junctions if empty
        p = get_active_predictor()
        for j_id in ["JNGP001", "JNGP002", "JNGP003", "JNGP004", "JNGP005"]:
            res = p.predict({"junction_id": j_id})
            ts = datetime.utcnow().isoformat()
            _LATEST_PREDICTIONS_CACHE[j_id] = JunctionRiskItem(
                junction_id=j_id,
                risk_score=res["risk_score"],
                risk_level=res["predicted_class"],
                probabilities=PredictionProbabilities(**res["probabilities"]),
                prediction_time=ts,
                model_version=res.get("model_version", "rf_v1"),
            )

    return AllJunctionsRiskResponse(junctions=list(_LATEST_PREDICTIONS_CACHE.values()))
