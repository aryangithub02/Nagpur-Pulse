import math
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.junction import Junction
from app.services.police_unit_service import police_unit_service
from app.exceptions import LocationNotFoundException, RoutingUnavailableException

logger = logging.getLogger("routing_service")


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
    time_min = round((distance_km / avg_speed_kmh) * 60.0, 1)
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


class RoutingService:
    """Service orchestrating police unit navigation routes using TomTomService."""

    @staticmethod
    def calculate_route(db: Session, unit_id: str, junction_id_str: str) -> Dict[str, Any]:
        """Fetch unit and junction coordinates, compute route via TomTomService, and return normalized dict."""
        # 1. Retrieve unit via PoliceUnitService
        unit = police_unit_service.get_unit(db, unit_id)

        # 2. Parse and retrieve junction
        try:
            j_id = int(junction_id_str.replace("loc_", "")) if junction_id_str.startswith("loc_") else int(junction_id_str)
        except ValueError:
            raise LocationNotFoundException(f"Invalid junction ID format: '{junction_id_str}'.")

        junction = db.query(Junction).filter(Junction.id == j_id).first()
        if not junction:
            raise LocationNotFoundException(f"Junction location with ID '{junction_id_str}' not found.")

        # 3. Delegate to TomTomService for server-side route calculation
        from app.services.tomtom_service import tomtom_service
        try:
            route_res = tomtom_service.calculate_route(
                origin_lat=unit.latitude,
                origin_lon=unit.longitude,
                dest_lat=junction.latitude,
                dest_lon=junction.longitude
            )
            route_res["unitId"] = unit.id
            route_res["junctionId"] = str(junction.id)
            return route_res
        except Exception as e:
            logger.error(f"Error executing route calculation: {str(e)}")
            raise RoutingUnavailableException("Routing service is currently unavailable.")


routing_service = RoutingService()
