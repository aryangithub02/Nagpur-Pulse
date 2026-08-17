import logging
import time
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models.weather import WeatherObservation
from app.services.weather_impact_service import weather_impact_service
from app.adapters.schemas.weather import CanonicalWeatherState
from app.adapters.weather.openweather import OpenWeatherAdapter
from app.adapters.weather.simulated import SimulatedWeatherAdapter
from app.adapters.health import provider_health_service

logger = logging.getLogger("weather_service")

NAGPUR_LAT = 21.1458
NAGPUR_LON = 79.0882


class WeatherService:
    """
    OpenWeather API Integration & Weather Intelligence Service.
    Now backed by clean Provider-Adapter architecture returning CanonicalWeatherState.
    """

    def __init__(self):
        self.api_key = settings.weather.api_key
        self.base_url = settings.weather.base_url
        self.cache_ttl_seconds = settings.weather.cache_ttl_minutes * 60

        # Initialize active adapter
        if (settings.providers.weather_provider or "openweather").lower() == "simulated":
            self.adapter = SimulatedWeatherAdapter()
        else:
            self.adapter = OpenWeatherAdapter()

        self._cached_current: Optional[Dict[str, Any]] = None
        self._cached_canonical: Optional[CanonicalWeatherState] = None
        self._last_current_fetch: float = 0.0

        self._cached_forecast: Optional[List[Dict[str, Any]]] = None
        self._last_forecast_fetch: float = 0.0

    def _get_fallback_observation(self, status_msg: str = "DEGRADED") -> Dict[str, Any]:
        """
        Returns normalized baseline weather data when external API is unreachable or unconfigured.
        """
        now_iso = datetime.utcnow().isoformat()
        impact = weather_impact_service.calculate_impact(
            precipitation_mm=0.0,
            visibility_km=10.0,
            wind_speed_kmh=12.0,
            storm_flag=False,
            temperature_c=28.0,
        )
        return {
            "status": status_msg,
            "observed_at": now_iso,
            "location": {"name": "Nagpur", "latitude": NAGPUR_LAT, "longitude": NAGPUR_LON},
            "weather": {
                "temperature_c": 28.0,
                "feels_like_c": 30.0,
                "humidity_pct": 65,
                "pressure_hpa": 1012,
                "wind_speed_kmh": 12.0,
                "wind_direction_deg": 180,
                "precipitation_mm": 0.0,
                "precipitation_probability_pct": 0,
                "visibility_km": 10.0,
                "cloud_cover_pct": 20,
                "weather_code": 800,
                "weather_condition": "Clear",
                "rain_intensity": "NONE",
                "lightning_probability": 0.0,
                "storm_flag": False,
                "severe_weather_flag": False,
            },
            "traffic_impact": impact,
        }

    def fetch_current_from_openweather(self) -> Optional[Dict[str, Any]]:
        """
        Executes HTTP GET request to OpenWeatherMap /weather endpoint.
        """
        if not self.api_key:
            logger.warning("OPENWEATHER_API_KEY is not configured in environment. Using normalized fallback.")
            return None

        url = f"{self.base_url}/weather"
        params = {
            "lat": NAGPUR_LAT,
            "lon": NAGPUR_LON,
            "appid": self.api_key,
            "units": "metric",
        }
        try:
            with httpx.Client(timeout=1.5) as client:
                resp = client.get(url, params=params)
                if resp.status_code == 200:
                    return resp.json()
                else:
                    logger.error(f"OpenWeather API error {resp.status_code}: {resp.text}")
                    return None
        except Exception as e:
            logger.error(f"Failed to fetch OpenWeather current weather: {e}")
            return None

    def fetch_forecast_from_openweather(self) -> Optional[Dict[str, Any]]:
        """
        Executes HTTP GET request to OpenWeatherMap /forecast endpoint.
        """
        if not self.api_key:
            return None

        url = f"{self.base_url}/forecast"
        params = {
            "lat": NAGPUR_LAT,
            "lon": NAGPUR_LON,
            "appid": self.api_key,
            "units": "metric",
            "cnt": 8,  # Next 24 hours (3-hour intervals)
        }
        try:
            with httpx.Client(timeout=1.5) as client:
                resp = client.get(url, params=params)
                if resp.status_code == 200:
                    return resp.json()
                else:
                    logger.error(f"OpenWeather forecast API error {resp.status_code}: {resp.text}")
                    return None
        except Exception as e:
            logger.error(f"Failed to fetch OpenWeather forecast: {e}")
            return None

    def normalize_current_response(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes raw OpenWeather JSON into canonical WeatherObservation dictionary.
        """
        now_iso = datetime.utcnow().isoformat()
        main = data.get("main", {})
        wind = data.get("wind", {})
        clouds = data.get("clouds", {})
        rain = data.get("rain", {})
        weather_list = data.get("weather", [{}])
        w_item = weather_list[0] if weather_list else {}

        temp_c = float(main.get("temp", 28.0))
        feels_like = float(main.get("feels_like", temp_c))
        humidity = float(main.get("humidity", 65))
        pressure = float(main.get("pressure", 1012))
        
        wind_speed_ms = float(wind.get("speed", 3.0))
        wind_speed_kmh = round(wind_speed_ms * 3.6, 1)
        wind_deg = float(wind.get("deg", 0))

        precip_mm = float(rain.get("1h", 0.0)) if isinstance(rain, dict) else 0.0
        vis_meters = float(data.get("visibility", 10000))
        vis_km = round(vis_meters / 1000.0, 1)
        cloud_cover = float(clouds.get("all", 0))

        w_code = int(w_item.get("id", 800))
        w_cond = str(w_item.get("main", "Clear"))
        
        storm_flag = 200 <= w_code < 300
        severe_flag = w_code in [212, 221, 502, 503, 504, 781] or precip_mm > 35.0

        impact = weather_impact_service.calculate_impact(
            precipitation_mm=precip_mm,
            visibility_km=vis_km,
            wind_speed_kmh=wind_speed_kmh,
            storm_flag=storm_flag,
            severe_weather_flag=severe_flag,
            temperature_c=temp_c,
        )

        return {
            "status": "HEALTHY",
            "observed_at": now_iso,
            "location": {"name": "Nagpur", "latitude": NAGPUR_LAT, "longitude": NAGPUR_LON},
            "weather": {
                "temperature_c": temp_c,
                "feels_like_c": feels_like,
                "humidity_pct": humidity,
                "pressure_hpa": pressure,
                "wind_speed_kmh": wind_speed_kmh,
                "wind_direction_deg": wind_deg,
                "precipitation_mm": precip_mm,
                "precipitation_probability_pct": 100.0 if precip_mm > 0 else 0.0,
                "visibility_km": vis_km,
                "cloud_cover_pct": cloud_cover,
                "weather_code": w_code,
                "weather_condition": w_cond,
                "rain_intensity": impact["rain_intensity"],
                "lightning_probability": 85.0 if storm_flag else 0.0,
                "storm_flag": storm_flag,
                "severe_weather_flag": severe_flag,
            },
            "traffic_impact": impact,
        }

    def get_canonical_weather(self, db: Optional[Session] = None) -> CanonicalWeatherState:
        """
        Retrieves current weather as provider-independent CanonicalWeatherState object.
        """
        now_time = time.time()
        if self._cached_canonical and (now_time - self._last_current_fetch) < self.cache_ttl_seconds:
            return self._cached_canonical

        start_t = time.time()
        raw = self.adapter.fetch_current() if hasattr(self.adapter, "fetch_current") else None
        latency_ms = (time.time() - start_t) * 1000.0

        if raw:
            canonical_state = self.adapter.normalize_current(raw)
            provider_health_service.record_success("weather", self.adapter.provider_name, latency_ms)
        else:
            canonical_state = SimulatedWeatherAdapter().normalize_current({})
            provider_health_service.record_failure("weather", self.adapter.provider_name, "API unconfigured or unreachable")

        self._cached_canonical = canonical_state
        self._cached_current = canonical_state.to_dict()
        self._last_current_fetch = now_time

        return canonical_state

    def get_current_weather(self, db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Retrieves current weather (with 15-minute caching & DB persistence).
        Backed by CanonicalWeatherState under the hood.
        """
        canonical = self.get_canonical_weather(db=db)
        return canonical.to_dict()

    def get_weather_forecast(self) -> List[Dict[str, Any]]:
        """
        Retrieves hourly weather forecast & projected risk timeline.
        """
        now_time = time.time()
        if self._cached_forecast and (now_time - self._last_forecast_fetch) < (self.cache_ttl_seconds * 2):
            return self._cached_forecast

        raw = self.fetch_forecast_from_openweather()
        if not raw or "list" not in raw:
            # Generate synthesized 3-hour forecast fallback
            base = self.get_current_weather()
            forecast_items = []
            for i in range(1, 5):
                future_time = datetime.utcnow() + timedelta(hours=i * 3)
                w_copy = dict(base["weather"])
                forecast_items.append({
                    "forecast_for": future_time.isoformat(),
                    "hours_ahead": i * 3,
                    "weather": w_copy,
                    "traffic_impact": base["traffic_impact"],
                })
            return forecast_items

        forecast_items = []
        for item in raw.get("list", [])[:6]:
            dt_txt = item.get("dt_txt", datetime.utcnow().isoformat())
            main = item.get("main", {})
            wind = item.get("wind", {})
            rain = item.get("rain", {})
            weather_list = item.get("weather", [{}])
            w_item = weather_list[0] if weather_list else {}

            precip_mm = float(rain.get("3h", 0.0)) / 3.0 if isinstance(rain, dict) else 0.0
            vis_km = round(float(item.get("visibility", 10000)) / 1000.0, 1)
            temp_c = float(main.get("temp", 28.0))
            wind_kmh = round(float(wind.get("speed", 3.0)) * 3.6, 1)
            w_code = int(w_item.get("id", 800))
            w_cond = str(w_item.get("main", "Clear"))
            storm = 200 <= w_code < 300

            impact = weather_impact_service.calculate_impact(
                precipitation_mm=precip_mm,
                visibility_km=vis_km,
                wind_speed_kmh=wind_kmh,
                storm_flag=storm,
                temperature_c=temp_c,
            )

            forecast_items.append({
                "forecast_for": dt_txt,
                "weather": {
                    "temperature_c": temp_c,
                    "precipitation_mm": precip_mm,
                    "visibility_km": vis_km,
                    "wind_speed_kmh": wind_kmh,
                    "weather_condition": w_cond,
                    "storm_flag": storm,
                },
                "traffic_impact": impact,
            })

        self._cached_forecast = forecast_items
        self._last_forecast_fetch = now_time
        return forecast_items


weather_service = WeatherService()
