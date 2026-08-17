"""
Nagpur Pulse — Simulated Routing Adapter.
Uses haversine calculations and weather-aware speed estimates to build CanonicalRouteResult without external HTTP calls.
"""

from typing import Optional
from app.adapters.base.routing import RoutingAdapter
from app.adapters.schemas.routing import CanonicalRouteResult
from app.adapters.schemas.provenance import DataProvenance, SourceType, now_iso
from app.services.spatial_utils import (
    haversine_distance_km,
    estimate_travel_time_minutes,
    generate_route_waypoints,
)


class SimulatedRoutingAdapter(RoutingAdapter):
    """
    Offline routing adapter using spatial Haversine trigonometry.
    """

    @property
    def provider_name(self) -> str:
        return "SIMULATED_HAVERSINE"

    @property
    def adapter_version(self) -> str:
        return "1.0.0"

    def calculate_route(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        origin_unit_id: Optional[str] = None,
        dest_junction_id: Optional[str] = None,
    ) -> CanonicalRouteResult:
        dist_km = haversine_distance_km(origin_lat, origin_lon, dest_lat, dest_lon)
        dist_meters = int(dist_km * 1000)
        time_min = estimate_travel_time_minutes(dist_km)
        time_sec = int(time_min * 60)

        waypoints = generate_route_waypoints(origin_lat, origin_lon, dest_lat, dest_lon, steps=5)
        coords = [[pt["longitude"], pt["latitude"]] for pt in waypoints]
        now_str = now_iso()

        prov = DataProvenance(
            source_type=SourceType.SIMULATED,
            source_provider=self.provider_name,
            observed_at=now_str,
            received_at=now_str,
            quality_score=0.90,
            quality_flags=[],
            adapter_version=self.adapter_version,
        )

        return CanonicalRouteResult(
            origin_unit_id=origin_unit_id,
            destination_junction_id=dest_junction_id,
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            distance_km=dist_km,
            distance_meters=dist_meters,
            duration_minutes=time_min,
            duration_seconds=time_sec,
            traffic_aware=False,
            is_simulated=True,
            route_geometry={"type": "LineString", "coordinates": coords},
            waypoints=waypoints,
            observed_at=now_str,
            received_at=now_str,
            provenance=prov,
        )
