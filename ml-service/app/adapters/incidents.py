"""
Traffic Incidents Adapter Interface (Mock Implementation for Phase 2).
"""

from typing import Any, Dict, Optional

class IncidentsAdapter:
    STATUS = "MOCK"

    def fetch(
        self,
        location_id: str,
        start_time: Optional[Any] = None,
        end_time: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Fetch real-time traffic incidents (active accident alerts, road closures, breakdown vehicles).
        """
        return {
            "status": self.STATUS,
            "location_id": location_id,
            "active_accidents": 0,
            "road_closures": 0,
            "lane_closures": 0,
            "broken_down_vehicles": 0,
            "is_live": False
        }
