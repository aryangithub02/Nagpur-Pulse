"""
Nagpur Pulse — Canonical Weather State Schema.
Provider-independent internal representation of weather telemetry.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any
from .provenance import DataProvenance, now_iso


class WeatherCondition(str, Enum):
    CLEAR = "CLEAR"
    CLOUDS = "CLOUDS"
    DRIZZLE = "DRIZZLE"
    RAIN = "RAIN"
    HEAVY_RAIN = "HEAVY_RAIN"
    THUNDERSTORM = "THUNDERSTORM"
    FOG = "FOG"
    MIST = "MIST"
    HAZE = "HAZE"
    DUST = "DUST"
    UNKNOWN = "UNKNOWN"


@dataclass
class CanonicalWeatherState:
    """
    Provider-independent canonical representation of weather state for a region or junction.
    Consumable by RiskService, ML features, coverage, and routing without knowing if OpenWeather or another provider was used.
    """
    location_name: str = "Nagpur"
    latitude: float = 21.1458
    longitude: float = 79.0882

    temperature_c: float = 28.0
    feels_like_c: float = 30.0
    humidity_percent: float = 65.0
    pressure_hpa: float = 1012.0

    wind_speed_kmh: float = 12.0
    wind_direction_deg: float = 180.0

    precipitation_mm: float = 0.0
    precipitation_probability_pct: float = 0.0
    visibility_km: float = 10.0
    cloud_cover_pct: float = 20.0

    weather_code: int = 800
    weather_condition: str = WeatherCondition.CLEAR

    rain_intensity: str = "NONE"
    lightning_probability: float = 0.0
    storm_flag: bool = False
    severe_weather_flag: bool = False

    observed_at: str = field(default_factory=now_iso)
    received_at: str = field(default_factory=now_iso)

    # Computed traffic impact factors
    traffic_impact_score: float = 0.0
    eta_multiplier: float = 1.0

    provenance: Optional[DataProvenance] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "location": {
                "name": self.location_name,
                "latitude": self.latitude,
                "longitude": self.longitude,
            },
            "weather": {
                "temperature_c": self.temperature_c,
                "feels_like_c": self.feels_like_c,
                "humidity_pct": self.humidity_percent,
                "pressure_hpa": self.pressure_hpa,
                "wind_speed_kmh": self.wind_speed_kmh,
                "wind_direction_deg": self.wind_direction_deg,
                "precipitation_mm": self.precipitation_mm,
                "precipitation_probability_pct": self.precipitation_probability_pct,
                "visibility_km": self.visibility_km,
                "cloud_cover_pct": self.cloud_cover_pct,
                "weather_code": self.weather_code,
                "weather_condition": self.weather_condition,
                "rain_intensity": self.rain_intensity,
                "lightning_probability": self.lightning_probability,
                "storm_flag": self.storm_flag,
                "severe_weather_flag": self.severe_weather_flag,
            },
            "traffic_impact": {
                "score": self.traffic_impact_score,
                "eta_multiplier": self.eta_multiplier,
                "rain_intensity": self.rain_intensity,
            },
            "observed_at": self.observed_at,
            "received_at": self.received_at,
            "source": {
                "type": self.provenance.source_type if self.provenance else "UNKNOWN",
                "provider": self.provenance.source_provider if self.provenance else "UNKNOWN",
            },
            "quality": {
                "score": self.provenance.quality_score if self.provenance else 1.0,
                "flags": self.provenance.quality_flags if self.provenance else [],
            },
        }
