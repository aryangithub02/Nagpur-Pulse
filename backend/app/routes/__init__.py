"""Routes package for Nagpur Pulse API."""
from app.routes.health import router as health_router
from app.routes.predict import router as predict_router
from app.routes.junctions import router as junctions_router
from app.routes.observations import router as observations_router

__all__ = [
    "health_router",
    "predict_router",
    "junctions_router",
    "observations_router",
]
