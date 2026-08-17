"""
Nagpur Pulse ML Service - FastAPI Application
"""

import os
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure ml-service root directory is on sys.path
SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

# Ensure project root directory is on sys.path
PROJECT_ROOT = SERVICE_ROOT.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.common import HealthResponse, ModelInfoResponse, ErrorResponse
from app.schemas.risk import RiskPredictionRequest, RiskPredictionResponse
from app.services.risk_service import get_model_info, predict_traffic_risk

app = FastAPI(
    title="Nagpur Pulse ML Service",
    description="Traffic Risk Prediction ML FastAPI Endpoint",
    version="1.0.0",
)

# ------------------------------------------------------------------------------
# CORS Middleware
# ------------------------------------------------------------------------------
raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Exception Handlers
# ------------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """
    Custom handler for Pydantic validation errors returning clean HTTP 422 response.
    """
    errors = exc.errors()
    if errors:
        first_error = errors[0]
        msg = first_error.get("msg", "Validation error")
        loc = " -> ".join([str(x) for x in first_error.get("loc", []) if x != "body"])
        detail_msg = f"{loc}: {msg}" if loc else msg
    else:
        detail_msg = "Invalid request payload."

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": detail_msg},
    )

@app.exception_handler(ValueError)
async def value_error_handler(request, exc: ValueError):
    """
    Custom handler for ValueError returning HTTP 422 detail response.
    """
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)},
    )

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc: Exception):
    """
    Custom handler for generic unexpected errors returning HTTP 500 detail response.
    """
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error: {str(exc)}"},
    )

# ------------------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------------------
@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Health check endpoint",
)
def health_check():
    """
    Simple health check endpoint. Does NOT load ML model.
    """
    return HealthResponse(status="ok", service="nagpur-pulse-ml")

@app.get(
    "/model/info",
    response_model=ModelInfoResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve ML model metadata and load status",
)
def model_info():
    """
    Returns loaded model type, version, and load status.
    Returns HTTP 500 if model fails to load.
    """
    try:
        info = get_model_info()
        return ModelInfoResponse(**info)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Model loading failure: {str(exc)}",
        )

@app.post(
    "/predict",
    response_model=RiskPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate traffic risk prediction for a junction",
    responses={
        422: {"model": ErrorResponse, "description": "Validation Error"},
        500: {"model": ErrorResponse, "description": "Prediction Failure"},
    },
)
def predict(payload: RiskPredictionRequest):
    """
    Predict traffic risk level, confidence, and class probabilities for a given junction.
    """
    try:
        input_data = payload.model_dump()
        result = predict_traffic_risk(input_data)
        return RiskPredictionResponse(**result)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction failure: {str(exc)}",
        )
