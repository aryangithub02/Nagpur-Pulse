"""
Nagpur Pulse — Canonical Police Unit State Schema.
Provider-independent internal representation of police vehicle / officer telemetry.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Any
from .provenance import DataProvenance, now_iso


class PoliceUnitStatus(str, Enum):
    AVAILABLE = "AVAILABLE"
    PATROLLING = "PATROLLING"
    DISPATCHED = "DISPATCHED"
    DEPLOYED = "DEPLOYED"
    EN_ROUTE = "EN_ROUTE"
    ON_SCENE = "ON_SCENE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"
    UNAVAILABLE = "UNAVAILABLE"


@dataclass
class CanonicalPoliceUnitState:
    """
    Provider-independent canonical representation of a police patrol unit / PCR van.
    """
    unit_id: str                              # e.g. "PU001"
    name: str = ""                            # e.g. "PCR Van 01"
    call_sign: str = ""                       # e.g. "EAGLE-1"
    vehicle_type: str = "PCR_VAN"             # PCR_VAN / MOTORCYCLE / TRAFFIC_INTERCEPTOR

    latitude: float = 21.1458
    longitude: float = 79.0882
    zone_code: str = "CENTRAL"

    status: str = PoliceUnitStatus.AVAILABLE
    capabilities: List[str] = field(default_factory=lambda: ["TRAFFIC_CONTROL", "ACCIDENT_RESPONSE"])

    officer_name: Optional[str] = None
    contact_number: Optional[str] = None
    fuel_level_percent: Optional[float] = 100.0

    current_assignment_id: Optional[str] = None
    current_junction_id: Optional[int] = None

    last_seen_at: str = field(default_factory=now_iso)
    observed_at: str = field(default_factory=now_iso)
    received_at: str = field(default_factory=now_iso)

    provenance: Optional[DataProvenance] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "unit_id": self.unit_id,
            "id": self.unit_id,
            "name": self.name or self.unit_id,
            "call_sign": self.call_sign or self.name or self.unit_id,
            "vehicle_type": self.vehicle_type,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "zone_code": self.zone_code,
            "status": self.status,
            "availability": self.status,
            "capabilities": self.capabilities,
            "officer_name": self.officer_name,
            "contact_number": self.contact_number,
            "current_junction_id": self.current_junction_id,
            "last_seen_at": self.last_seen_at,
            "source": {
                "type": self.provenance.source_type if self.provenance else "INTERNAL",
                "provider": self.provenance.source_provider if self.provenance else "INTERNAL",
            },
            "quality": {
                "score": self.provenance.quality_score if self.provenance else 1.0,
                "flags": self.provenance.quality_flags if self.provenance else [],
            },
        }
