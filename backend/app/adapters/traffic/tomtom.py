"""
Nagpur Pulse — TomTom Traffic Flow Adapter.
Encapsulates all TomTom-specific API calls, response format parsing, and normalization into CanonicalTrafficState.
No raw TomTom JSON leaves this adapter.
"""

import logging
import os
import httpx
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.adapters.base.traffic import TrafficAdapter
from app.adapters.schemas.traffic import CanonicalTrafficState, speed_to_level, congestion_to_level
from app.adapters.schemas.provenance import DataProvenance, QualityFlag, SourceType, now_iso
from app.config import settings

logger = logging.getLogger("adapter.traffic.tomtom")


class TomTomTrafficAdapter(TrafficAdapter):
    """
    Adapter consuming TomTom Traffic Flow Segment API.
    """

    def __init__(self):
        self.api_key = settings.providers.tomtom_api_key or os.getenv("TOMTOM_API_KEY", "")
        self.base_url = settings.providers.tomtom_base_url or os.getenv("TOMTOM_BASE_URL", "https://api.tomtom.com")
        self.timeout_seconds = settings.providers.traffic_timeout_seconds

    @property
    def provider_name(self) -> str:
        return "TOMTOM"

    @property
    def adapter_version(self) -> str:
        return "1.0.0"

    def fetch_traffic(self, junction_id: Optional[int] = None, lat: float = 21.1458, lon: float = 79.0882) -> Optional[Dict[str, Any]]:
        """
        Calls TomTom Flow Segment Data API for coordinates.
        """
        api_key = self.api_key.strip()
        if not api_key:
            logger.warning("TomTom API key not configured. Cannot fetch live traffic.")
            return None

        url = f"{self.base_url}/traffic/services/4/flowSegmentData/relative0/10/json"
        params = {
            "key": api_key,
            "point": f"{lat},{lon}",
            "unit": "KMPH",
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                resp = client.get(url, params=params)
                if resp.status_code == 200:
                    return resp.json()
                else:
                    logger.error(f"TomTom Traffic API returned status {resp.status_code}: {resp.text}")
                    return None
        except Exception as e:
            logger.error(f"TomTom Traffic API request failed: {e}")
            return None

    def normalize(self, raw_data: Any, spatial_context: Optional[Dict[str, Any]] = None) -> List[CanonicalTrafficState]:
        """
        Maps raw TomTom flowSegmentData JSON into CanonicalTrafficState list.
        """
        if not raw_data or not isinstance(raw_data, dict):
            return []

        flow_data = raw_data.get("flowSegmentData", {})
        if not flow_data:
            return []

        ctx = spatial_context or {}
        j_id = ctx.get("junction_id", 1)
        spatial_id = ctx.get("spatial_id", f"JNGP{j_id:03d}")
        lat = ctx.get("latitude", 21.1458)
        lon = ctx.get("longitude", 79.0882)

        curr_speed = float(flow_data.get("currentSpeed", 30.0))
        free_speed = float(flow_data.get("freeFlowSpeed", 40.0))
        curr_travel_time = float(flow_data.get("currentTravelTime", 60.0))
        free_travel_time = float(flow_data.get("freeFlowTravelTime", 45.0))

        # Congestion % calculation
        if free_speed > 0:
            congestion_pct = max(0.0, min(100.0, (1.0 - (curr_speed / free_speed)) * 100.0))
        else:
            congestion_pct = 0.0

        delay_mins = max(0.0, round((curr_travel_time - free_travel_time) / 60.0, 1))
        t_level = congestion_to_level(congestion_pct)

        confidence = float(flow_data.get("confidence", 0.95))
        now_str = now_iso()

        provenance = DataProvenance(
            source_type=SourceType.EXTERNAL,
            source_provider=self.provider_name,
            observed_at=now_str,
            received_at=now_str,
            spatial_id=spatial_id,
            quality_score=confidence,
            quality_flags=[],
            adapter_version=self.adapter_version,
            provider_api_version="4",
        )

        state = CanonicalTrafficState(
            junction_id=j_id,
            spatial_id=spatial_id,
            latitude=lat,
            longitude=lon,
            speed_kmh=round(curr_speed, 1),
            free_flow_speed_kmh=round(free_speed, 1),
            congestion_percent=round(congestion_pct, 1),
            delay_minutes=delay_mins,
            traffic_level=t_level.value,
            observed_at=now_str,
            received_at=now_str,
            provenance=provenance,
        )

        is_valid, flags = self.validate(state)
        if not is_valid:
            provenance.quality_flags.extend(flags)
            provenance.quality_score = max(0.2, provenance.quality_score - 0.4)

        return [state]
