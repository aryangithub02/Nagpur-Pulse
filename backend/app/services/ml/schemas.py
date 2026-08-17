"""
Backend schemas for ML service integration matching ML API standard endpoints (/api/v1/ml/*).
"""

from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict


class SinglePredictionRequest(BaseModel):
    """Payload for single junction traffic risk prediction."""
    model_config = ConfigDict(extra="allow")

    junction_id: str = Field(..., description="Unique junction identifier (e.g. 'JNGP001' or '1')")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp for prediction observation")

    # Normalized traffic & incident feature inputs matching Phase 2 Feature Pipeline
    month: Optional[int] = Field(default=8, ge=1, le=12, description="Month of year (1-12)")
    total_accidents: Optional[float] = Field(default=0.0, ge=0.0, description="Total accidents count")
    fatal_accidents: Optional[float] = Field(default=0.0, ge=0.0, description="Fatal accidents count")
    injury_accidents: Optional[float] = Field(default=0.0, ge=0.0, description="Injury accidents count")
    accidents_7d: Optional[float] = Field(default=0.0, ge=0.0, description="7-day accident count")
    accidents_30d: Optional[float] = Field(default=0.0, ge=0.0, description="30-day accident count")
    accidents_90d: Optional[float] = Field(default=0.0, ge=0.0, description="90-day accident count")
    accidents_1y: Optional[float] = Field(default=0.0, ge=0.0, description="1-year accident count")
    accidents_lag_1: Optional[float] = Field(default=0.0, ge=0.0, description="1-month lag accident count")
    accidents_rolling_mean_3: Optional[float] = Field(default=0.0, ge=0.0, description="3-month rolling mean accidents")
    accidents_rolling_mean_6: Optional[float] = Field(default=0.0, ge=0.0, description="6-month rolling mean accidents")
    historical_accident_rate: Optional[float] = Field(default=0.0, ge=0.0, description="Historical accident rate per month")
    junction_target_enc: Optional[float] = Field(default=0.0, description="Target encoded junction index")
    junction_ordinal_enc: Optional[float] = Field(default=0.0, description="Encoded junction index")

    # Contextual live traffic telemetry parameters
    speed: Optional[float] = Field(default=None, ge=0.0, description="Current average traffic speed in km/h")
    density: Optional[float] = Field(default=None, ge=0.0, description="Traffic volume / density count")
    congestion: Optional[float] = Field(default=None, ge=0.0, le=100.0, description="Traffic congestion percentage")


class BatchPredictionRequest(BaseModel):
    """Payload for batch predictions across multiple junctions."""
    predictions: List[SinglePredictionRequest] = Field(..., min_length=1)


class PredictionProbabilities(BaseModel):
    """4-class probability distribution."""
    LOW: float = Field(default=0.0, ge=0.0, le=1.0)
    MEDIUM: float = Field(default=0.0, ge=0.0, le=1.0)
    HIGH: float = Field(default=0.0, ge=0.0, le=1.0)
    CRITICAL: float = Field(default=0.0, ge=0.0, le=1.0)


class PredictionDetail(BaseModel):
    """Predicted risk level, continuous risk score, and class probabilities."""
    risk_level: str = Field(..., description="Categorical risk level: LOW, MEDIUM, HIGH, CRITICAL")
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Continuous risk index (0.0 to 100.0)")
    probabilities: PredictionProbabilities = Field(...)


class ModelDetail(BaseModel):
    """ML model name and version information."""
    name: str = Field(default="RandomForest")
    version: str = Field(default="rf_v1")


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
    status: str
    model_loaded: bool
    model: str
    model_version: str
    feature_version: str


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
