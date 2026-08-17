"""
Illegal Parking Adapter Interface (Mock Implementation for Phase 2).
"""

from typing import Any, Dict, Optional

class ParkingAdapter:
    STATUS = "MOCK"

    def fetch(
        self,
        location_id: str,
        start_time: Optional[Any] = None,
        end_time: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Fetch illegal parking count and severity.
        """
        return {
            "status": self.STATUS,
            "location_id": location_id,
            "illegally_parked_count": 0,
            "severity_level": "LOW",
            "is_live": False
        }
