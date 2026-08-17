from pydantic import BaseModel, ConfigDict, Field, field_validator

class RiskPredictionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    accidents_7d: float = Field(..., description="Number of accidents in past 7 days")
    accidents_30d: float = Field(..., description="Number of accidents in past 30 days")
    accidents_90d: float = Field(..., description="Number of accidents in past 90 days")
    accidents_1y: float = Field(..., description="Number of accidents in past 1 year")
    fatal_accidents_1y: float = Field(..., description="Number of fatal accidents in past 1 year")
    injury_accidents_1y: float = Field(..., description="Number of injury accidents in past 1 year")
    historical_accident_rate: float = Field(..., description="Historical accident rate")
    junction: str = Field(..., description="Junction name")

    @field_validator("accidents_7d", "accidents_30d", "accidents_90d", "accidents_1y", "fatal_accidents_1y", "injury_accidents_1y", "historical_accident_rate")
    @classmethod
    def validate_non_negative(cls, v: float, info) -> float:
        if v < 0:
            raise ValueError(f"Value for {info.field_name} cannot be negative: {v}")
        return v

    @field_validator("junction")
    @classmethod
    def validate_junction_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Junction cannot be empty.")
        return v.strip()

class Probabilities(BaseModel):
    LOW: float
    MEDIUM: float
    HIGH: float

class RiskPredictionResponse(BaseModel):
    risk_level: str
    confidence: float
    model_version: str
    probabilities: Probabilities
