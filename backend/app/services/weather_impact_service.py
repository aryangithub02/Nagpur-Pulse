"""
Weather Impact Service for Nagpur Pulse.
Translates atmospheric weather telemetry (rainfall, visibility, wind, storm indicators)
into operational traffic impact scores (0-100) and risk levels (NORMAL, MODERATE, HIGH, SEVERE).
"""

import logging
from typing import Dict, Any

logger = logging.getLogger("weather_impact_service")


class WeatherImpactService:
    """
    Operational Weather Impact Calculator for urban traffic risk.
    """

    @staticmethod
    def calculate_impact(
        precipitation_mm: float = 0.0,
        visibility_km: float = 10.0,
        wind_speed_kmh: float = 0.0,
        storm_flag: bool = False,
        severe_weather_flag: bool = False,
        temperature_c: float = 28.0,
    ) -> Dict[str, Any]:
        """
        Calculates operational weather impact score and factors.
        """
        # 1. Rain Component (0 to 40 pts)
        p = max(0.0, float(precipitation_mm or 0.0))
        if p == 0.0:
            rain_pts = 0.0
            rain_intensity = "NONE"
        elif p < 2.5:
            rain_pts = 10.0
            rain_intensity = "LIGHT"
        elif p < 10.0:
            rain_pts = 22.0
            rain_intensity = "MODERATE"
        elif p < 35.0:
            rain_pts = 32.0
            rain_intensity = "HEAVY"
        else:
            rain_pts = 40.0
            rain_intensity = "EXTREME"

        # 2. Visibility Component (0 to 30 pts)
        vis = max(0.1, float(visibility_km or 10.0))
        if vis >= 10.0:
            vis_pts = 0.0
        elif vis >= 5.0:
            vis_pts = 8.0
        elif vis >= 2.0:
            vis_pts = 18.0
        elif vis >= 1.0:
            vis_pts = 25.0
        else:
            vis_pts = 30.0

        # 3. Wind Component (0 to 15 pts)
        w = max(0.0, float(wind_speed_kmh or 0.0))
        if w < 15.0:
            wind_pts = 0.0
        elif w < 30.0:
            wind_pts = 5.0
        elif w < 50.0:
            wind_pts = 10.0
        else:
            wind_pts = 15.0

        # 4. Storm / Severe Component (0 to 15 pts)
        storm_pts = 0.0
        if storm_flag:
            storm_pts += 10.0
        if severe_weather_flag:
            storm_pts += 5.0

        # Total Normalized Score (0 - 100)
        total_score = min(100.0, rain_pts + vis_pts + wind_pts + storm_pts)
        total_score = round(total_score, 1)

        # Classify Level according to exact 5-tier scale:
        # 0-20: LOW, 21-40: MODERATE, 41-60: ELEVATED, 61-80: HIGH, 81-100: SEVERE
        if total_score <= 20.0:
            level = "LOW"
        elif total_score <= 40.0:
            level = "MODERATE"
        elif total_score <= 60.0:
            level = "ELEVATED"
        elif total_score <= 80.0:
            level = "HIGH"
        else:
            level = "SEVERE"

        return {
            "score": total_score,
            "level": level,
            "rain_intensity": rain_intensity,
            "factors": {
                "rain_component": round(rain_pts, 1),
                "visibility_component": round(vis_pts, 1),
                "wind_component": round(wind_pts, 1),
                "storm_component": round(storm_pts, 1),
            },
            "speed_penalty_pct": min(45.0, round(total_score * 0.45, 1)),
            "eta_multiplier": round(1.0 + (total_score / 200.0), 2),
        }

    @staticmethod
    def calculate_combined_score(
        weather_impact_score: float,
        traffic_congestion_score: float,
        w_weather: float = 0.60,
        w_traffic: float = 0.40
    ) -> float:
        """
        Calculates operational combined weather-traffic impact score.
        Formula: combined = w_weather * weather_impact_score + w_traffic * traffic_congestion_score
        """
        w_score = max(0.0, min(100.0, float(weather_impact_score or 0.0)))
        t_score = max(0.0, min(100.0, float(traffic_congestion_score or 0.0)))
        combined = (w_weather * w_score) + (w_traffic * t_score)
        return round(min(100.0, max(0.0, combined)), 1)


weather_impact_service = WeatherImpactService()
