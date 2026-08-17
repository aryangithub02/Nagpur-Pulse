"""
Nagpur Pulse — TomTom Routing Adapter.
Encapsulates TomTom Calculate Route API and maps output to CanonicalRouteResult.
"""

from typing import Dict, Any, Optional
from app.adapters.base.routing import RoutingAdapter
from app.adapters.schemas.routing import CanonicalRouteResult
from app.adapters.schemas.provenance import DataProvenance, QualityFlag, SourceType, now_iso
from app.services.tomtom_service import tomtom_service


class TomTomRoutingAdapter(RoutingAdapter):
    """
    Adapter calculating traffic-aware navigation routes using TomTom Routing API.
    """

    @property
    def provider_name(self) -> str:
        return "TOMTOM_ROUTING"

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
        raw = tomtom_service.calculate_route(origin_lat, origin_lon, dest_lat, dest_lon)
        now_str = now_iso()
        is_sim = raw.get("is_simulated", False)

        prov = DataProvenance(
            source_type=SourceType.SIMULATED if is_sim else SourceType.EXTERNAL,
            source_provider="TOMTOM" if not is_sim else "HAVERSINE_FALLBACK",
            observed_at=now_str,
            received_at=now_str,
            quality_score=0.75 if is_sim else 0.98,
            quality_flags=[QualityFlag.USING_FALLBACK] if is_sim else [],
            adapter_version=self.adapter_version,
        )

        return CanonicalRouteResult(
            origin_unit_id=origin_unit_id,
            destination_junction_id=dest_junction_id,
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            distance_km=float(raw.get("distance_km", 0.0)),
            distance_meters=int(raw.get("distance_meters", 0)),
            duration_minutes=float(raw.get("travel_time_minutes", 1.0)),
            duration_seconds=int(raw.get("travel_time_seconds", 60)),
            traffic_aware=not is_sim,
            is_simulated=is_sim,
            route_geometry=raw.get("route_geometry", {"type": "LineString", "coordinates": []}),
            observed_at=now_str,
            received_at=now_str,
            provenance=prov,
        )
