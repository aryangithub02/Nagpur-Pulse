"""
Nagpur Pulse — Base Routing Adapter Interface.
All routing adapters (TomTom, OSRM, Haversine fallback) must implement this contract.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple, List
from app.adapters.schemas.routing import CanonicalRouteResult


class RoutingAdapter(ABC):
    """
    Abstract Base Class for Routing and Travel Time Calculation Adapters.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def adapter_version(self) -> str:
        pass

    @abstractmethod
    def calculate_route(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        origin_unit_id: Optional[str] = None,
        dest_junction_id: Optional[str] = None,
    ) -> CanonicalRouteResult:
        pass

    def validate(self, result: CanonicalRouteResult) -> Tuple[bool, List[str]]:
        flags = []
        is_valid = True

        if result.distance_km < 0.0 or result.duration_minutes < 0.0:
            flags.append("OUT_OF_RANGE")
            is_valid = False

        return is_valid, flags
