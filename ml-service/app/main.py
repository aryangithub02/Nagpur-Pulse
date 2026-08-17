"""
Nagpur Pulse ML Service - FastAPI Main Application Entrypoint.
Exposes /api/v1/ml/* inference endpoints and lifespan single-instance model initialization.
"""

import os
import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

# Ensure project root and ml-service root are on sys.path
SERVICE_ROOT = Path(__file__).resolve().parent.parent
PROJECT_ROOT = SERVICE_ROOT.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from ml.api.routes import router as ml_router, predictor

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("NagpurPulse.MLMain")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager loading Random Forest ML model once on boot.
    """
    logger.info("Initializing Nagpur Pulse ML Service...")
    if predictor is not None and predictor.model is not None:
        logger.info(f"Loaded ML model '{predictor.metadata.get('model_name', 'RandomForest')}' v{predictor.metadata.get('model_version', 'rf_v1')} into memory.")
    else:
        logger.warning("ML model artifact loading deferred or unavailable.")
    yield
    logger.info("Shutting down Nagpur Pulse ML Service.")


app = FastAPI(
    title="Nagpur Pulse ML Service",
    description="Traffic Risk Prediction ML Inference API (Phase 4)",
    version="1.0.0",
    lifespan=lifespan,
)

# ------------------------------------------------------------------------------
# CORS Middleware
# ------------------------------------------------------------------------------
raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,*"
)
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------------------------------
# Exception Handlers
# ------------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc: RequestValidationError):
    """Structured handler for Pydantic validation errors (HTTP 422)."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": {"code": "VALIDATION_ERROR", "message": "Invalid request payload schema", "details": exc.errors()}},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request, exc: ValueError):
    """Structured handler for ValueError (HTTP 400)."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"error": {"code": "INVALID_INPUT", "message": str(exc)}},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc: Exception):
    """Structured handler for unexpected server errors (HTTP 500)."""
    logger.error(f"Uncaught exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": {"code": "INTERNAL_SERVER_ERROR", "message": "An internal ML service error occurred."}},
    )


# ------------------------------------------------------------------------------
# Router Mounts
# ------------------------------------------------------------------------------
# Mount Phase 4 ML API router
app.include_router(ml_router)

# Root convenience redirects & compatibility health
@app.get("/health", tags=["System"])
def legacy_health():
    """Root health check redirecting to /api/v1/ml/health."""
    return ml_router.routes[0].endpoint()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=True)
