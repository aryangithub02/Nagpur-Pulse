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


def resolve_unit_zone(lat: float, lon: float, unit_id: str = "", unit_name: str = "") -> str:
    """Classifies police unit into one of 5 operational zones: CENTRAL, NORTH, EAST, WEST, SOUTH."""
    name_upper = (unit_name or unit_id).upper()
    if any(k in name_upper for k in ["SOUTH", "MANEWADA", "AJNI", "CHATRAPATI", "KHAMLA", "MEDICAL", "SOMALWADA"]):
        return "SOUTH"
    if any(k in name_upper for k in ["NORTH", "INDORA", "KAMPTEE", "GADDI", "AUTOMOTIVE", "MANKAPUR", "KADBI"]):
        return "NORTH"
    if any(k in name_upper for k in ["EAST", "ITWARI", "KALAMNA", "PARDI", "VAISHNODEVI", "GOLIBAR", "LAKADGANJ"]):
        return "EAST"
    if any(k in name_upper for k in ["WEST", "LAXMI", "SHANKAR", "DHARAMPETH", "MATE", "AMBAZARI", "WADI", "BAJAJ"]):
        return "WEST"
    if any(k in name_upper for k in ["CENTRAL", "SADAR", "SITABULDI", "LIC", "LOKMAT", "COTTON", "SAMVIDHAN", "VARIETY"]):
        return "CENTRAL"

    # Spatial classification centered around Central Nagpur (21.1458, 79.0882)
    if lat < 21.135:
        return "SOUTH"
    elif lat > 21.160:
        return "NORTH"
    elif lon > 79.105:
        return "EAST"
    elif lon < 79.070:
        return "WEST"
    return "CENTRAL"
