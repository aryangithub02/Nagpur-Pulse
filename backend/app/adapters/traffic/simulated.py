"""
Nagpur Pulse — Simulated Traffic Adapter.
Normalizes internal database observations / synthetic telemetry into CanonicalTrafficState objects.
Used for offline development, local demonstrations, and automated testing.
"""

import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from app.adapters.base.traffic import TrafficAdapter
from app.adapters.schemas.traffic import CanonicalTrafficState, speed_to_level, congestion_to_level
from app.adapters.schemas.provenance import DataProvenance, QualityFlag, SourceType, now_iso

logger = logging.getLogger("adapter.traffic.simulated")


class SimulatedTrafficAdapter(TrafficAdapter):
    """
    Adapter reading existing DB TrafficObservation records or simulated telemetry.
    """

    @property
    def provider_name(self) -> str:
        return "SIMULATED"

    @property
    def adapter_version(self) -> str:
        return "1.0.0"

    def fetch_traffic(self, junction_id: Optional[int] = None) -> Any:
        return {}

    def normalize(self, raw_data: Any, spatial_context: Optional[Dict[str, Any]] = None) -> List[CanonicalTrafficState]:
        """
        Normalizes internal database traffic dictionaries or TrafficObservation models into CanonicalTrafficState list.
        """
        if not raw_data:
            return []

        # If a single item or list was passed
        items = raw_data if isinstance(raw_data, list) else [raw_data]
        results = []

        for item in items:
            # item can be dict or TrafficObservation object
            if hasattr(item, "traffic_data"):
                t_dict = getattr(item, "traffic_data", {}) or {}
                j_id = getattr(item, "junction_id", 1)
                timestamp = getattr(item, "timestamp", None)
            elif isinstance(item, dict):
                t_dict = item.get("traffic_data", item)
                j_id = item.get("junction_id", 1)
                timestamp = item.get("timestamp", None)
            else:
                continue

            ctx = spatial_context or {}
            spatial_id = ctx.get("spatial_id", f"JNGP{j_id:03d}")
            lat = ctx.get("latitude", 21.1458)
            lon = ctx.get("longitude", 79.0882)

            speed = float(t_dict.get("current_speed", t_dict.get("speed_kmh", 30.0)))
            free_flow = float(t_dict.get("free_flow_speed", t_dict.get("free_flow_speed_kmh", 40.0)))
            congestion = float(t_dict.get("congestion_level", t_dict.get("congestion_percent", 25.0)))
            delay = float(t_dict.get("delay_minutes", 1.5))
            level_str = t_dict.get("traffic_level", congestion_to_level(congestion).value)

            obs_iso = timestamp.isoformat() if hasattr(timestamp, "isoformat") else (str(timestamp) if timestamp else now_iso())

            provenance = DataProvenance(
                source_type=SourceType.SIMULATED,
                source_provider=self.provider_name,
                observed_at=obs_iso,
                received_at=now_iso(),
                spatial_id=spatial_id,
                quality_score=0.98,
                quality_flags=[],
                adapter_version=self.adapter_version,
            )

            state = CanonicalTrafficState(
                junction_id=j_id,
                spatial_id=spatial_id,
                latitude=lat,
                longitude=lon,
                speed_kmh=round(speed, 1),
                free_flow_speed_kmh=round(free_flow, 1),
                congestion_percent=round(congestion, 1),
                delay_minutes=round(delay, 1),
                traffic_level=level_str,
                observed_at=obs_iso,
                received_at=now_iso(),
                provenance=provenance,
            )
            results.append(state)

        return results
