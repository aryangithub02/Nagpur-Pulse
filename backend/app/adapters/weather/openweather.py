"""
Nagpur Pulse — OpenWeatherMap Weather Adapter.
Encapsulates all OpenWeather API communication and response normalization into CanonicalWeatherState.
No raw OpenWeather JSON leaks outside this adapter.
"""

import logging
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from app.adapters.base.weather import WeatherAdapter
from app.adapters.schemas.weather import CanonicalWeatherState, WeatherCondition
from app.adapters.schemas.provenance import DataProvenance, QualityFlag, SourceType, now_iso
from app.services.weather_impact_service import weather_impact_service
from app.config import settings

logger = logging.getLogger("adapter.weather.openweather")

NAGPUR_LAT = 21.1458
NAGPUR_LON = 79.0882


class OpenWeatherAdapter(WeatherAdapter):
    """
    Adapter fetching and normalizing OpenWeatherMap live current weather.
    """

    def __init__(self):
        self.api_key = settings.weather.api_key
        self.base_url = settings.weather.base_url
        self.timeout_seconds = settings.providers.weather_timeout_seconds

    @property
    def provider_name(self) -> str:
        return "OPENWEATHER"

    @property
    def adapter_version(self) -> str:
        return "1.0.0"

    def fetch_current(self) -> Optional[Dict[str, Any]]:
        """
        Calls OpenWeather /weather endpoint.
        """
        if not self.api_key:
            logger.warning("OpenWeather API key not configured.")
            return None

        url = f"{self.base_url}/weather"
        params = {
            "lat": NAGPUR_LAT,
            "lon": NAGPUR_LON,
            "appid": self.api_key,
            "units": "metric",
        }
        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                resp = client.get(url, params=params)
                if resp.status_code == 200:
                    return resp.json()
                else:
                    logger.error(f"OpenWeather returned HTTP {resp.status_code}: {resp.text}")
                    return None
        except Exception as e:
            logger.error(f"OpenWeather fetch failed: {e}")
            return None

    def normalize_current(self, data: Dict[str, Any]) -> CanonicalWeatherState:
        """
        Transforms OpenWeather JSON into CanonicalWeatherState.
        """
        now_str = now_iso()
        if not data or not isinstance(data, dict):
            # Fallback state with degraded provenance
            prov = DataProvenance(
                source_type=SourceType.FALLBACK,
                source_provider=self.provider_name,
                observed_at=now_str,
                received_at=now_str,
                quality_score=0.4,
                quality_flags=[QualityFlag.PROVIDER_ERROR],
            )
            return CanonicalWeatherState(provenance=prov)

        main = data.get("main", {})
        wind = data.get("wind", {})
        clouds = data.get("clouds", {})
        rain = data.get("rain", {})
        weather_list = data.get("weather", [{}])
        w_item = weather_list[0] if weather_list else {}

        temp_c = float(main.get("temp", 28.0))
        feels_like = float(main.get("feels_like", temp_c))
        humidity = float(main.get("humidity", 65.0))
        pressure = float(main.get("pressure", 1012.0))

        wind_speed_ms = float(wind.get("speed", 3.0))
        wind_speed_kmh = round(wind_speed_ms * 3.6, 1)
        wind_deg = float(wind.get("deg", 180.0))

        precip_mm = float(rain.get("1h", 0.0)) if isinstance(rain, dict) else 0.0
        vis_meters = float(data.get("visibility", 10000.0))
        vis_km = round(vis_meters / 1000.0, 1)
        cloud_cover = float(clouds.get("all", 0.0))

        w_code = int(w_item.get("id", 800))
        w_cond = str(w_item.get("main", "Clear"))

        storm_flag = 200 <= w_code < 300
        severe_flag = w_code in [212, 221, 502, 503, 504, 781] or precip_mm > 35.0

        # Calculate domain traffic impact
        impact = weather_impact_service.calculate_impact(
            precipitation_mm=precip_mm,
            visibility_km=vis_km,
            wind_speed_kmh=wind_speed_kmh,
            storm_flag=storm_flag,
            severe_weather_flag=severe_flag,
            temperature_c=temp_c,
        )

        provenance = DataProvenance(
            source_type=SourceType.EXTERNAL,
            source_provider=self.provider_name,
            observed_at=now_str,
            received_at=now_str,
            spatial_id="nagpur-central",
            quality_score=0.95,
            quality_flags=[],
            adapter_version=self.adapter_version,
            provider_api_version="2.5",
        )

        state = CanonicalWeatherState(
            location_name="Nagpur",
            latitude=NAGPUR_LAT,
            longitude=NAGPUR_LON,
            temperature_c=temp_c,
            feels_like_c=feels_like,
            humidity_percent=humidity,
            pressure_hpa=pressure,
            wind_speed_kmh=wind_speed_kmh,
            wind_direction_deg=wind_deg,
            precipitation_mm=precip_mm,
            precipitation_probability_pct=100.0 if precip_mm > 0 else 0.0,
            visibility_km=vis_km,
            cloud_cover_pct=cloud_cover,
            weather_code=w_code,
            weather_condition=w_cond,
            rain_intensity=impact.get("rain_intensity", "NONE"),
            lightning_probability=85.0 if storm_flag else 0.0,
            storm_flag=storm_flag,
            severe_weather_flag=severe_flag,
            observed_at=now_str,
            received_at=now_str,
            traffic_impact_score=impact.get("score", 0.0),
            eta_multiplier=impact.get("eta_multiplier", 1.0),
            provenance=provenance,
        )

        is_valid, flags = self.validate(state)
        if not is_valid:
            provenance.quality_flags.extend(flags)
            provenance.quality_score = max(0.3, provenance.quality_score - 0.3)

        return state
