"""
Nagpur Pulse — Canonical Traffic State Schema.
Provider-independent internal representation of junction traffic telemetry.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional
from .provenance import DataProvenance, now_iso


class TrafficLevel(str, Enum):
    """Canonical traffic congestion level."""
    FREE = "FREE"
    LIGHT = "LIGHT"
    MODERATE = "MODERATE"
    HEAVY = "HEAVY"
    STANDSTILL = "STANDSTILL"
    UNKNOWN = "UNKNOWN"


def speed_to_level(speed_kmh: float, free_flow_kmh: float = 40.0) -> TrafficLevel:
    """Derive canonical TrafficLevel from speed ratio."""
    if free_flow_kmh <= 0:
        return TrafficLevel.UNKNOWN
    ratio = speed_kmh / free_flow_kmh
    if ratio >= 0.85:
        return TrafficLevel.FREE
    if ratio >= 0.65:
        return TrafficLevel.LIGHT
    if ratio >= 0.40:
        return TrafficLevel.MODERATE
    if ratio >= 0.15:
        return TrafficLevel.HEAVY
    return TrafficLevel.STANDSTILL


def congestion_to_level(congestion_pct: float) -> TrafficLevel:
    """Derive canonical TrafficLevel from congestion percentage."""
    if congestion_pct < 15:
        return TrafficLevel.FREE
    if congestion_pct < 35:
        return TrafficLevel.LIGHT
    if congestion_pct < 60:
        return TrafficLevel.MODERATE
    if congestion_pct < 80:
        return TrafficLevel.HEAVY
    return TrafficLevel.STANDSTILL


@dataclass
class CanonicalTrafficState:
    """
    Provider-independent canonical representation of traffic state at a junction.

    This is the ONLY traffic format that RiskService, FastAllocationService,
    ML feature builders, and frontend APIs should consume.

    NOTE: quality_score = data reliability (0–1). NOT risk_score.
    """
    junction_id: int                          # Internal DB junction ID
    spatial_id: str                           # e.g. "nagpur-j17"

    latitude: float
    longitude: float

    speed_kmh: float
    free_flow_speed_kmh: float = 40.0
    congestion_percent: float = 0.0
    delay_minutes: float = 0.0

    traffic_level: str = TrafficLevel.UNKNOWN

    observed_at: str = field(default_factory=now_iso)
    received_at: str = field(default_factory=now_iso)

    provenance: Optional[DataProvenance] = None

    def to_dict(self) -> dict:
        return {
            "junction_id": self.junction_id,
            "spatial_id": self.spatial_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "speed_kmh": self.speed_kmh,
            "free_flow_speed_kmh": self.free_flow_speed_kmh,
            "congestion_percent": self.congestion_percent,
            "delay_minutes": self.delay_minutes,
            "traffic_level": self.traffic_level,
            "observed_at": self.observed_at,
            "received_at": self.received_at,
            "source": {
                "type": self.provenance.source_type if self.provenance else "UNKNOWN",
                "provider": self.provenance.source_provider if self.provenance else "UNKNOWN",
            },
            "quality": {
                "score": self.provenance.quality_score if self.provenance else 1.0,
                "flags": self.provenance.quality_flags if self.provenance else [],
            },
        }
