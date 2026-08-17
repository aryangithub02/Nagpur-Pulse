"""
Nagpur Pulse — Spatial & Trigonometric Routing Utilities.
Provides coordinate distance calculations, travel time estimates, and waypoints generation.
"""

import math
from typing import List, Dict


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate Great Circle distance in km between two lat/lon coordinates."""
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def estimate_travel_time_minutes(distance_km: float, avg_speed_kmh: float = 30.0) -> float:
    """Estimate travel time in minutes based on distance and average city speed."""
    if distance_km <= 0:
        return 1.0

    eta_mult = 1.0
    try:
        from app.services.weather_service import weather_service
        w_curr = weather_service.get_current_weather()
        eta_mult = float(w_curr.get("traffic_impact", {}).get("eta_multiplier", 1.0))
    except Exception:
        eta_mult = 1.0

    effective_speed = max(5.0, avg_speed_kmh / eta_mult)
    time_min = round((distance_km / effective_speed) * 60.0, 1)
    return max(1.0, time_min)


def generate_route_waypoints(lat1: float, lon1: float, lat2: float, lon2: float, steps: int = 5) -> List[Dict[str, float]]:
    """Generate linear map waypoints between origin and destination."""
    points = []
    for i in range(steps + 1):
        ratio = i / steps
        lat = lat1 + (lat2 - lat1) * ratio
        lon = lon1 + (lon2 - lon1) * ratio
        points.append({"latitude": round(lat, 6), "longitude": round(lon, 6)})
    return points
