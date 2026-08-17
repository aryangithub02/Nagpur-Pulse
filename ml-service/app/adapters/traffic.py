"""
TomTom Traffic API Adapter Interface (Mock Implementation for Phase 2).
"""

from typing import Any, Dict, Optional

class TrafficAdapter:
    STATUS = "MOCK"

    def fetch(
        self,
        location_id: str,
        start_time: Optional[Any] = None,
        end_time: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Fetch real-time traffic flow data (current speed, free-flow speed, travel time, delay seconds).
        Returns mock data structure.
        """
        return {
            "status": self.STATUS,
            "location_id": location_id,
            "current_speed_kph": 25.0,
            "free_flow_speed_kph": 40.0,
            "travel_time_seconds": 180,
            "delay_seconds": 45,
            "congestion_level": "MODERATE",
            "is_live": False
        }
