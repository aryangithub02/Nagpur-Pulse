"""
Weather Data Adapter Interface (Mock Implementation for Phase 2).
"""

from typing import Any, Dict, Optional

class WeatherAdapter:
    STATUS = "MOCK"

    def fetch(
        self,
        location_id: str,
        start_time: Optional[Any] = None,
        end_time: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Fetch weather conditions (condition, precipitation, visibility).
        """
        return {
            "status": self.STATUS,
            "location_id": location_id,
            "condition": "CLEAR",
            "temperature_celsius": 28.0,
            "precipitation_mm": 0.0,
            "visibility_km": 10.0,
            "is_live": False
        }
