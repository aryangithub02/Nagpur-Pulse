"""
Nagpur Pulse — Canonical Routing & Navigation Schema.
Provider-independent internal representation of routing calculations and GeoJSON navigation geometry.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from .provenance import DataProvenance, now_iso


@dataclass
class CanonicalRouteResult:
    """
    Provider-independent canonical representation of a calculated dispatch route.
    """
    origin_unit_id: Optional[str] = None
    destination_junction_id: Optional[str] = None

    origin_lat: float = 0.0
    origin_lon: float = 0.0
    dest_lat: float = 0.0
    dest_lon: float = 0.0

    distance_km: float = 0.0
    distance_meters: int = 0
    duration_minutes: float = 0.0
    duration_seconds: int = 0

    traffic_aware: bool = True
    is_simulated: bool = False

    route_geometry: Dict[str, Any] = field(default_factory=lambda: {"type": "LineString", "coordinates": []})
    waypoints: List[Dict[str, float]] = field(default_factory=list)

    observed_at: str = field(default_factory=now_iso)
    received_at: str = field(default_factory=now_iso)

    provenance: Optional[DataProvenance] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "unitId": self.origin_unit_id,
            "junctionId": self.destination_junction_id,
            "distance_km": self.distance_km,
            "distance_meters": self.distance_meters,
            "travel_time_minutes": self.duration_minutes,
            "travel_time_seconds": self.duration_seconds,
            "traffic_aware": self.traffic_aware,
            "is_simulated": self.is_simulated,
            "route_geometry": self.route_geometry,
            "waypoints": self.waypoints,
            "source": {
                "type": self.provenance.source_type if self.provenance else "UNKNOWN",
                "provider": self.provenance.source_provider if self.provenance else "UNKNOWN",
            },
            "quality": {
                "score": self.provenance.quality_score if self.provenance else 1.0,
                "flags": self.provenance.quality_flags if self.provenance else [],
            },
        }
