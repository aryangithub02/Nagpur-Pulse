"""
Nagpur Pulse — Base Traffic Adapter Interface.
All traffic adapters (TomTom, Government, Simulated) must implement this contract.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from app.adapters.schemas.traffic import CanonicalTrafficState
from app.adapters.schemas.provenance import AdapterError


class TrafficAdapter(ABC):
    """
    Abstract Base Class for Traffic Data Adapters.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g. 'TOMTOM', 'GOVERNMENT', 'SIMULATED')."""
        pass

    @property
    @abstractmethod
    def adapter_version(self) -> str:
        """Version string of the adapter."""
        pass

    @abstractmethod
    def fetch_traffic(self, junction_id: Optional[int] = None) -> Any:
        """
        Fetch raw traffic data from the provider.
        Returns provider-specific payload or raises an exception.
        """
        pass

    @abstractmethod
    def normalize(self, raw_data: Any, spatial_context: Optional[Dict[str, Any]] = None) -> List[CanonicalTrafficState]:
        """
        Transform provider-specific payload into CanonicalTrafficState list.
        Must NOT raise uncaught exceptions; handle malformed records cleanly.
        """
        pass

    def validate(self, state: CanonicalTrafficState) -> Tuple[bool, List[str]]:
        """
        Standardized validation of normalized traffic state.
        Returns (is_valid, list_of_quality_flags).
        """
        flags = []
        is_valid = True

        if state.speed_kmh < 0.0 or state.speed_kmh > 200.0:
            flags.append("OUT_OF_RANGE")
            is_valid = False

        if state.congestion_percent < 0.0 or state.congestion_percent > 100.0:
            flags.append("OUT_OF_RANGE")
            is_valid = False

        if not (20.0 <= state.latitude <= 22.0) or not (78.0 <= state.longitude <= 80.5):
            flags.append("INVALID_COORDINATES")
            is_valid = False

        if state.free_flow_speed_kmh <= 0.0:
            flags.append("MISSING_FIELD")

        return is_valid, flags
