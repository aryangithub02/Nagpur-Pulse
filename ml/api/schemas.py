"""
Pydantic v2 Request and Response Schemas for Nagpur Pulse ML Service API (/api/v1/ml/*).
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class SinglePredictionRequest(BaseModel):
    """Payload for single junction traffic risk prediction."""
    model_config = ConfigDict(extra="allow")

    junction_id: str = Field(..., description="Unique junction identifier (e.g. 'JNGP001' or '1')")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp for prediction observation")
    
    # Feature inputs matching Phase 2 Feature Pipeline
    month: Optional[int] = Field(default=8, ge=1, le=12, description="Month of year (1-12)")
    total_accidents: Optional[float] = Field(default=0.0, ge=0.0, description="Total accidents count")
    accidents_7d: Optional[float] = Field(default=0.0, ge=0.0, description="7-day accident count")
    accidents_30d: Optional[float] = Field(default=0.0, ge=0.0, description="30-day accident count")
    accidents_lag_1: Optional[float] = Field(default=0.0, ge=0.0, description="1-month lag accident count")
    accidents_rolling_mean_3: Optional[float] = Field(default=0.0, ge=0.0, description="3-month rolling mean accidents")
    junction_ordinal_enc: Optional[float] = Field(default=0.0, description="Encoded junction index")


class BatchPredictionRequest(BaseModel):
    """Payload for batch predictions across multiple junctions."""
    predictions: List[SinglePredictionRequest] = Field(..., min_length=1, description="Array of junction prediction requests")


class PredictionProbabilities(BaseModel):
    """4-class probability distribution."""
    LOW: float = Field(..., ge=0.0, le=1.0)
    MEDIUM: float = Field(..., ge=0.0, le=1.0)
    HIGH: float = Field(..., ge=0.0, le=1.0)
    CRITICAL: float = Field(..., ge=0.0, le=1.0)


class PredictionDetail(BaseModel):
    """Predicted risk level, continuous risk score, and class probabilities."""
    risk_level: str = Field(..., description="Categorical risk level: LOW, MEDIUM, HIGH, CRITICAL")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Continuous risk index (0.0 to 100.0)")
    probabilities: PredictionProbabilities = Field(..., description="Probability breakdown across classes")


class ModelDetail(BaseModel):
    """ML model name and version information."""
    name: str = Field(..., description="Model architecture name (e.g. 'RandomForest')")
    version: str = Field(..., description="Model version string (e.g. 'rf_v1')")


class SinglePredictionResponse(BaseModel):
    """Response payload for a single junction risk prediction."""
    junction_id: str
    prediction: PredictionDetail
    model: ModelDetail
    timestamp: str


class BatchPredictionResponse(BaseModel):
    """Response payload for batch junction predictions."""
    results: List[SinglePredictionResponse]


class JunctionRiskItem(BaseModel):
    """Stored junction risk record."""
    junction_id: str
    risk_score: float
    risk_level: str
    probabilities: PredictionProbabilities
    prediction_time: str
    model_version: str


class AllJunctionsRiskResponse(BaseModel):
    """Response payload for all monitored junction risk assessments."""
    junctions: List[JunctionRiskItem]


class HealthResponse(BaseModel):
    """ML service health status response."""
    status: str = Field(..., description="'healthy' or 'unhealthy'")
    model_loaded: bool = Field(..., description="True if ML model artifact is loaded in memory")
    model: str = Field(..., description="Model architecture name")
    model_version: str = Field(..., description="Model version string")
    feature_version: str = Field(..., description="Feature pipeline version")


class ModelInfoMetrics(BaseModel):
    """Selected model evaluation metrics."""
    accuracy: float
    macro_f1: float
    high_recall: float
    critical_recall: float


class ModelInfoResponse(BaseModel):
    """Detailed ML model metadata response."""
    model: str
    version: str
    feature_version: str
    target: str
    metrics: ModelInfoMetrics
