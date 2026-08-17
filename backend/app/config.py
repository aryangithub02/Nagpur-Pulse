"""
Nagpur Pulse Backend - Application Settings and Typed Configuration.
"""

import os
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()


class WeatherSettings(BaseModel):
    """Typed weather service configuration settings."""
    api_key: str = Field(default_factory=lambda: os.getenv("OPENWEATHER_API_KEY", ""))
    base_url: str = Field(default_factory=lambda: os.getenv("OPENWEATHER_BASE_URL", "https://api.openweathermap.org/data/2.5"))
    cache_ttl_minutes: int = Field(default_factory=lambda: int(os.getenv("WEATHER_CACHE_TTL_MINUTES", "15")))
    default_lat: float = 21.1458
    default_lon: float = 79.0882


class ProviderSettings(BaseModel):
    """Provider adapter configuration — controls which external data providers are active."""

    # Traffic
    traffic_provider: str = Field(default_factory=lambda: os.getenv("TRAFFIC_PROVIDER", "simulated"))
    traffic_fallback_provider: str = Field(default_factory=lambda: os.getenv("TRAFFIC_FALLBACK_PROVIDER", "cached"))
    traffic_timeout_seconds: float = Field(default_factory=lambda: float(os.getenv("TRAFFIC_PROVIDER_TIMEOUT", "5")))
    traffic_max_age_seconds: int = Field(default_factory=lambda: int(os.getenv("TRAFFIC_MAX_AGE_SECONDS", "300")))

    # Weather
    weather_provider: str = Field(default_factory=lambda: os.getenv("WEATHER_PROVIDER", "openweather"))
    weather_timeout_seconds: float = Field(default_factory=lambda: float(os.getenv("WEATHER_PROVIDER_TIMEOUT", "5")))
    weather_max_age_seconds: int = Field(default_factory=lambda: int(os.getenv("WEATHER_MAX_AGE_SECONDS", "900")))

    # Police
    police_provider: str = Field(default_factory=lambda: os.getenv("POLICE_PROVIDER", "simulated"))
    police_max_age_seconds: int = Field(default_factory=lambda: int(os.getenv("POLICE_MAX_AGE_SECONDS", "60")))

    # Routing
    routing_provider: str = Field(default_factory=lambda: os.getenv("ROUTING_PROVIDER", "tomtom"))
    routing_timeout_seconds: float = Field(default_factory=lambda: float(os.getenv("ROUTING_PROVIDER_TIMEOUT", "5")))

    # TomTom credentials
    tomtom_api_key: str = Field(default_factory=lambda: os.getenv("TOMTOM_API_KEY", ""))
    tomtom_base_url: str = Field(default_factory=lambda: os.getenv("TOMTOM_BASE_URL", "https://api.tomtom.com"))
    tomtom_traffic_enabled: bool = Field(default_factory=lambda: os.getenv("TOMTOM_TRAFFIC_ENABLED", "false").lower() == "true")

    # Provider retry policy
    max_retries: int = Field(default_factory=lambda: int(os.getenv("MAX_PROVIDER_RETRIES", "2")))


class AppSettings(BaseModel):
    """Global backend application settings."""
    app_name: str = Field(default_factory=lambda: os.getenv("APP_NAME", "Nagpur Pulse Backend API"))
    environment: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    database_url: str = Field(default_factory=lambda: os.getenv("DATABASE_URL", "sqlite:///./nagpur_pulse.db"))
    weather: WeatherSettings = Field(default_factory=WeatherSettings)
    providers: ProviderSettings = Field(default_factory=ProviderSettings)


settings = AppSettings()
