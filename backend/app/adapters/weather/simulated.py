"""
Nagpur Pulse — Simulated Weather Adapter.
Provides deterministic baseline / offline weather states for testing and offline scenarios.
"""

from typing import Dict, Any, Optional
from app.adapters.base.weather import WeatherAdapter
from app.adapters.schemas.weather import CanonicalWeatherState, WeatherCondition
from app.adapters.schemas.provenance import DataProvenance, QualityFlag, SourceType, now_iso
from app.services.weather_impact_service import weather_impact_service


class SimulatedWeatherAdapter(WeatherAdapter):
    """
    Adapter providing baseline canonical weather without external HTTP dependencies.
    """

    @property
    def provider_name(self) -> str:
        return "SIMULATED"

    @property
    def adapter_version(self) -> str:
        return "1.0.0"

    def fetch_current(self) -> Optional[Dict[str, Any]]:
        return {
            "temp": 28.0,
            "humidity": 65.0,
            "wind_speed": 12.0,
            "precipitation": 0.0,
            "visibility": 10.0,
        }

    def normalize_current(self, data: Dict[str, Any]) -> CanonicalWeatherState:
        now_str = now_iso()
        impact = weather_impact_service.calculate_impact(
            precipitation_mm=0.0,
            visibility_km=10.0,
            wind_speed_kmh=12.0,
            storm_flag=False,
            temperature_c=28.0,
        )

        provenance = DataProvenance(
            source_type=SourceType.SIMULATED,
            source_provider=self.provider_name,
            observed_at=now_str,
            received_at=now_str,
            spatial_id="nagpur-central",
            quality_score=0.98,
            quality_flags=[],
            adapter_version=self.adapter_version,
        )

        return CanonicalWeatherState(
            location_name="Nagpur",
            latitude=21.1458,
            longitude=79.0882,
            temperature_c=28.0,
            feels_like_c=30.0,
            humidity_percent=65.0,
            pressure_hpa=1012.0,
            wind_speed_kmh=12.0,
            wind_direction_deg=180.0,
            precipitation_mm=0.0,
            precipitation_probability_pct=0.0,
            visibility_km=10.0,
            cloud_cover_pct=20.0,
            weather_code=800,
            weather_condition="Clear",
            rain_intensity="NONE",
            lightning_probability=0.0,
            storm_flag=False,
            severe_weather_flag=False,
            observed_at=now_str,
            received_at=now_str,
            traffic_impact_score=impact.get("score", 0.0),
            eta_multiplier=impact.get("eta_multiplier", 1.0),
            provenance=provenance,
        )
