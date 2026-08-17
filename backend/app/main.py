import logging
import os
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError
from dotenv import load_dotenv

from app.exceptions import (
    LocationNotFoundException,
    UnitNotFoundException,
    RecommendationNotFoundException,
    UnitUnavailableException,
    RoutingUnavailableException,
    DatabaseOperationException,
)

# Existing routers
from app.routes.health import router as health_router
from app.routes.predict import router as predict_router
from app.routes.junctions import router as junctions_router
from app.routes.observations import router as observations_router

# Phase 4 Frontend API routers
from app.routes.api.locations import router as api_locations_router
from app.routes.api.traffic import router as api_traffic_router
from app.routes.api.incidents import router as api_incidents_router
from app.routes.api.police_units import router as api_police_units_router
from app.routes.api.routing import router as api_routing_router
from app.routes.api.coverage import router as api_coverage_router
from app.routes.api.risk import router as api_risk_router
from app.routes.api.recommendations import router as api_recommendations_router
from app.routes.api.deployments import router as api_deployments_router
from app.routes.api.simulation import router as api_simulation_router

load_dotenv()

# Set up backend logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nagpur_pulse_backend")
logger.info("Initializing Nagpur Pulse Backend API Service...")

app = FastAPI(
    title="Nagpur Pulse Backend API",
    description="FastAPI REST API for Nagpur Pulse traffic risk monitoring, police dispatch, and ML analytics",
    version="1.0.0"
)

# ----------------------------------------------------
# Global & Domain Exception Handlers
# ----------------------------------------------------
@app.exception_handler(LocationNotFoundException)
@app.exception_handler(UnitNotFoundException)
@app.exception_handler(RecommendationNotFoundException)
async def not_found_domain_exception_handler(request: Request, exc: Exception):
    """Handle domain-level 404 Not Found exceptions."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)}
    )


@app.exception_handler(UnitUnavailableException)
async def unit_unavailable_exception_handler(request: Request, exc: UnitUnavailableException):
    """Handle domain-level 400 Bad Request unit availability exceptions."""
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)}
    )


@app.exception_handler(RoutingUnavailableException)
@app.exception_handler(DatabaseOperationException)
async def service_error_domain_exception_handler(request: Request, exc: Exception):
    """Handle domain-level 500 Service Error exceptions."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)}
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle standard HTTP exceptions with uniform detail message."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors safely (HTTP 422)."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Request validation failed", "errors": exc.errors()}
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle database errors safely without leaking internal SQL queries or credentials."""
    logger.error(f"Database error on {request.method} {request.url.path}: {str(exc)}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Database service error encountered. Please try again."}
    )


@app.exception_handler(Exception)
async def uncaught_exception_handler(request: Request, exc: Exception):
    """Global catch-all for uncaught server exceptions."""
    logger.error(f"Uncaught exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred."}
    )


# ----------------------------------------------------
# CORS Middleware Configuration
# ----------------------------------------------------
frontend_url = os.getenv("FRONTEND_URL", "")
cors_origins_env = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,*"
)
raw_origins = f"{frontend_url},{cors_origins_env}"
origins = list({origin.strip() for origin in raw_origins.split(",") if origin.strip()})

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------
# Router Mounts
# ----------------------------------------------------
app.include_router(health_router)
app.include_router(junctions_router)
app.include_router(observations_router)
app.include_router(predict_router)

# Register Phase 4 Frontend API routers (/api/*)
app.include_router(api_locations_router)
app.include_router(api_traffic_router)
app.include_router(api_incidents_router)
app.include_router(api_police_units_router)
app.include_router(api_routing_router)
app.include_router(api_coverage_router)
app.include_router(api_risk_router)
app.include_router(api_recommendations_router)
app.include_router(api_deployments_router)
app.include_router(api_simulation_router)
