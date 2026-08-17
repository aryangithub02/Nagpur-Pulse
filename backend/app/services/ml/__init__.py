"""
Backend ML Service integration package for Nagpur Pulse.
"""

from app.services.ml.ml_client import MLClient, ml_client
from app.services.ml.exceptions import (
    MLServiceException,
    MLServiceUnavailableException,
    MLPredictionException,
    MLValidationException,
)
from app.services.ml.schemas import (
    SinglePredictionRequest,
    BatchPredictionRequest,
    SinglePredictionResponse,
    BatchPredictionResponse,
    JunctionRiskItem,
    HealthResponse,
    ModelInfoResponse,
)

__all__ = [
    "MLClient",
    "ml_client",
    "MLServiceException",
    "MLServiceUnavailableException",
    "MLPredictionException",
    "MLValidationException",
    "SinglePredictionRequest",
    "BatchPredictionRequest",
    "SinglePredictionResponse",
    "BatchPredictionResponse",
    "JunctionRiskItem",
    "HealthResponse",
    "ModelInfoResponse",
]
