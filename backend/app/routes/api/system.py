"""
Nagpur Pulse — System & Provider Health API Endpoints.
Provides diagnostic transparency into active external data providers and adapter status.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends
from app.adapters.health import provider_health_service
from app.config import settings

router = APIRouter(prefix="/system", tags=["System & Providers"])


@router.get("/providers", response_model=Dict[str, Any])
def get_active_providers() -> Dict[str, Any]:
    """
    Returns active provider configurations for traffic, weather, police, and routing.
    Credentials and API keys are strictly excluded.
    """
    return {
        "environment": settings.environment,
        "traffic": {
            "active_provider": settings.providers.traffic_provider,
            "fallback_provider": settings.providers.traffic_fallback_provider,
            "timeout_seconds": settings.providers.traffic_timeout_seconds,
            "max_age_seconds": settings.providers.traffic_max_age_seconds,
            "tomtom_live_enabled": settings.providers.tomtom_traffic_enabled,
        },
        "weather": {
            "active_provider": settings.providers.weather_provider,
            "timeout_seconds": settings.providers.weather_timeout_seconds,
            "max_age_seconds": settings.providers.weather_max_age_seconds,
        },
        "police": {
            "active_provider": settings.providers.police_provider,
            "max_age_seconds": settings.providers.police_max_age_seconds,
        },
        "routing": {
            "active_provider": settings.providers.routing_provider,
            "timeout_seconds": settings.providers.routing_timeout_seconds,
        },
    }


@router.get("/providers/health", response_model=Dict[str, Any])
def get_provider_health() -> Dict[str, Any]:
    """
    Retrieves real-time operational health, latency metrics, and success/failure counters for all data adapters.
    """
    return provider_health_service.get_health_summary()
