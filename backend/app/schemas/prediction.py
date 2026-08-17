from datetime import datetime
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field, ConfigDict


class PredictionRequest(BaseModel):
    """Schema for prediction request input payload."""
    junction_id: Optional[int] = Field(
        None, description="Optional target junction ID to associate prediction history", example=1
    )
    features: Dict[str, Any] = Field(
        ...,
        description="Key-value dictionary of ML feature inputs",
        example={
            "speed": 45.5,
            "density": 120,
            "weather": "rainy",
            "hour": 18,
            "latitude": 21.1458,
            "longitude": 79.0882
        }
    )


class PredictionResponse(BaseModel):
    """Schema for prediction response payload."""
    id: Optional[int] = Field(None, description="Database prediction record ID if saved")
    junction_id: Optional[int] = Field(None, description="Associated junction ID if provided")
    timestamp: Optional[datetime] = Field(None, description="Timestamp of prediction")
    success: bool = Field(..., description="Whether the prediction operation succeeded")
    prediction: Union[int, float, str, Any] = Field(..., description="The predicted class, risk level, or output value")
    probability: Optional[float] = Field(None, description="Prediction probability/confidence score if available")
    is_mock: Optional[bool] = Field(None, description="True if response was produced by dev mock fallback adapter")
    message: Optional[str] = Field(None, description="Status or advisory message")

    model_config = ConfigDict(from_attributes=True)


class PredictionHistoryItem(BaseModel):
    """Schema for a single stored prediction in history."""
    id: int = Field(..., description="Unique prediction ID")
    junction_id: Optional[int] = Field(None, description="Junction ID")
    timestamp: datetime = Field(..., description="Prediction timestamp")
    prediction: Union[int, float, str, Any] = Field(..., description="Predicted value")
    probability: Optional[float] = Field(None, description="Probability score if present")
    is_mock: Optional[bool] = Field(None, description="Whether mock adapter was used")
    features_used: Optional[Dict[str, Any]] = Field(None, description="Input features evaluated")
    created_at: datetime = Field(..., description="Record creation timestamp")

    model_config = ConfigDict(from_attributes=True)


class PredictionHistoryResponse(BaseModel):
    """Schema for returning prediction history for a junction."""
    junction_id: int = Field(..., description="Junction ID")
    predictions: List[PredictionHistoryItem] = Field(..., description="List of historical predictions")
