"""Pydantic schemas package for Nagpur Pulse API."""
from app.schemas.junction import JunctionBase, JunctionCreate, JunctionResponse, JunctionListResponse
from app.schemas.observation import ObservationCreate, ObservationResponse
from app.schemas.prediction import PredictionRequest, PredictionResponse, PredictionHistoryItem, PredictionHistoryResponse

__all__ = [
    "JunctionBase",
    "JunctionCreate",
    "JunctionResponse",
    "JunctionListResponse",
    "ObservationCreate",
    "ObservationResponse",
    "PredictionRequest",
    "PredictionResponse",
    "PredictionHistoryItem",
    "PredictionHistoryResponse",
]
