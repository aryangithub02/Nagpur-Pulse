from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Dict

from .predictor import predict_risk


app = FastAPI(
    title="Nagpur Pulse ML API",
    description="Traffic accident risk prediction API",
    version="1.0.0",
)


class PredictionRequest(BaseModel):
    accidents_7d: float = Field(ge=0)
    accidents_30d: float = Field(ge=0)
    accidents_90d: float = Field(ge=0)
    accidents_1y: float = Field(ge=0)

    fatal_accidents_1y: float = Field(ge=0)
    injury_accidents_1y: float = Field(ge=0)

    historical_accident_rate: float = Field(ge=0)

    junction: str = Field(min_length=1)


class PredictionResponse(BaseModel):
    risk_level: str
    confidence: float
    model_version: str
    probabilities: Dict[str, float]


@app.get("/")
def root():
    return {
        "service": "Nagpur Pulse ML API",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": "traffic-risk-v1",
    }


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest):

    try:
        result = predict_risk(
            {
                "accidents_7d": request.accidents_7d,
                "accidents_30d": request.accidents_30d,
                "accidents_90d": request.accidents_90d,
                "accidents_1y": request.accidents_1y,
                "fatal_accidents_1y": request.fatal_accidents_1y,
                "injury_accidents_1y": request.injury_accidents_1y,
                "historical_accident_rate": request.historical_accident_rate,
                "junction": request.junction,
            }
        )

        return result

    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )