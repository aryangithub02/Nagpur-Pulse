import math
import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models.junction import Junction
from app.services.spatial_utils import (
    haversine_distance_km,
    estimate_travel_time_minutes,
    generate_route_waypoints,
)
from app.exceptions import LocationNotFoundException, RoutingUnavailableException

logger = logging.getLogger("routing_service")


class RoutingService:
    """Service orchestrating police unit navigation routes using TomTomService and RoutingAdapters."""

    def __init__(self):
        from app.adapters.routing.tomtom import TomTomRoutingAdapter
        self.adapter = TomTomRoutingAdapter()

    def calculate_canonical_route(
        self, db: Session, unit_id: str, junction_id_str: str
    ):
        """Fetch coordinates and compute route as CanonicalRouteResult."""
        from app.adapters.schemas.routing import CanonicalRouteResult
        from app.services.police_unit_service import police_unit_service
        unit = police_unit_service.get_unit(db, unit_id)

        try:
            j_id = int(junction_id_str.replace("loc_", "")) if junction_id_str.startswith("loc_") else int(junction_id_str)
        except ValueError:
            raise LocationNotFoundException(f"Invalid junction ID format: '{junction_id_str}'.")

        junction = db.query(Junction).filter(Junction.id == j_id).first()
        if not junction:
            raise LocationNotFoundException(f"Junction location with ID '{junction_id_str}' not found.")

        return self.adapter.calculate_route(
            origin_lat=unit.latitude,
            origin_lon=unit.longitude,
            dest_lat=junction.latitude,
            dest_lon=junction.longitude,
            origin_unit_id=unit.id,
            dest_junction_id=str(junction.id),
        )

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

