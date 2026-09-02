import logging
import os
from typing import Any, Dict, List, Optional
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

# Core routers
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
from app.routes.api.weather import router as api_weather_router
from app.routes.api.resource_allocation import router as api_resource_allocation_router, fast_router as api_fast_allocation_router

# Phase 5 Auth & Admin routers
from app.routes.auth import router as auth_router
from app.routes.admin import router as admin_router
from app.routes.api.simulations import router as api_simulations_v1_router
from app.routes.api.decisions import router as api_decisions_router
from app.routes.api.decision_review import router as api_decision_review_router
from app.routes.api.system import router as api_system_router
from app.bootstrap_admins import bootstrap_zones_and_admins

# Load environment variables
load_dotenv()
load_dotenv(".env")

# Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("nagpur_pulse_backend")
logger.info("Initializing Nagpur Pulse Backend API Service...")

app = FastAPI(
    title="Nagpur Pulse Backend API",
    description="FastAPI REST API with Argon2id RBAC/ZBAC for Nagpur Pulse traffic risk monitoring, police dispatch, and ML analytics",
    version="1.1.0"
)

# Dynamic CORS Middleware
cors_origins_env = os.getenv("CORS_ORIGINS", "")
parsed_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()] if cors_origins_env else []
frontend_url_env = os.getenv("FRONTEND_URL", "").strip()
if frontend_url_env and frontend_url_env not in parsed_origins:
    parsed_origins.append(frontend_url_env)

default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://nagpur-pulse.vercel.app",
    "https://nagpur-pulse-backend.onrender.com",
]
for origin in default_origins:
    if origin not in parsed_origins:
        parsed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=parsed_origins if "*" not in parsed_origins else ["*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def make_cors_response(request: Request, status_code: int, content: Any) -> JSONResponse:
    """Helper ensuring CORS headers are present on exception responses."""
    origin = request.headers.get("origin")
    headers = {}
    if origin:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
        headers["Access-Control-Allow-Methods"] = "*"
        headers["Access-Control-Allow-Headers"] = "*"
    return JSONResponse(status_code=status_code, content=content, headers=headers)

@app.on_event("startup")
def startup_initialize():
    """Backend service startup initialization: Seed 5 zones & initial admin accounts."""
    logger.info("Verifying database schema, operational zones & Argon2id hashed admin accounts...")
    try:
        from app.database import ensure_db_schema
        ensure_db_schema()
    except Exception as err:
        logger.warning(f"Database schema verification warning: {err}")

    try:
        bootstrap_zones_and_admins()
    except Exception as err:
        logger.warning(f"Bootstrap warning: {err}")
    logger.info("Nagpur Pulse Backend API ready and listening for authenticated telemetry & ML requests.")

# Exception Handlers
@app.exception_handler(LocationNotFoundException)
@app.exception_handler(UnitNotFoundException)
@app.exception_handler(RecommendationNotFoundException)
async def not_found_domain_exception_handler(request: Request, exc: Exception):
    return make_cors_response(
        request,
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": str(exc)}
    )

@app.exception_handler(UnitUnavailableException)
async def unit_unavailable_exception_handler(request: Request, exc: UnitUnavailableException):
    return make_cors_response(
        request,
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)}
    )

@app.exception_handler(RoutingUnavailableException)
@app.exception_handler(DatabaseOperationException)
async def service_error_domain_exception_handler(request: Request, exc: Exception):
    return make_cors_response(
        request,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": str(exc)}
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return make_cors_response(
        request,
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return make_cors_response(
        request,
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Request validation failed", "errors": exc.errors()}
    )

@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error on {request.method} {request.url.path}: {str(exc)}")
    return make_cors_response(
        request,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Database service error encountered: {str(exc)}"}
    )

@app.exception_handler(Exception)
async def uncaught_exception_handler(request: Request, exc: Exception):
    logger.error(f"Uncaught exception on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return make_cors_response(
        request,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"An internal server error occurred: {str(exc)}"}
    )

# Router Mounts
app.include_router(health_router)
app.include_router(junctions_router)
app.include_router(observations_router)
app.include_router(predict_router)

# Register Phase 4 Frontend API routers (/api/* and /api/v1/* aliases)
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
app.include_router(api_weather_router)
app.include_router(api_resource_allocation_router, prefix="/api/v1")
app.include_router(api_fast_allocation_router, prefix="/api/v1")
app.include_router(api_simulations_v1_router, prefix="/api/v1")
app.include_router(api_decisions_router, prefix="/api")
app.include_router(api_decisions_router, prefix="/api/v1")
app.include_router(api_decision_review_router, prefix="/api/decision-review")
app.include_router(api_decision_review_router, prefix="/api/v1/decision-review")
app.include_router(api_system_router, prefix="/api/v1")

# Register Phase 5 Auth & Admin Routers
app.include_router(auth_router)
app.include_router(admin_router)
