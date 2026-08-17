"""
Nagpur Pulse — Base Police Unit Adapter Interface.
All police adapters (Simulated, Government CAD/AVL feed) must implement this contract.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Tuple
from app.adapters.schemas.police import CanonicalPoliceUnitState


class PoliceAdapter(ABC):
    """
    Abstract Base Class for Police Unit / CAD / AVL Telemetry Adapters.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        pass

    @property
    @abstractmethod
    def adapter_version(self) -> str:
        pass

    @abstractmethod
    def fetch_units(self, zone_code: Optional[str] = None) -> Any:
        pass

    @abstractmethod
    def normalize_units(self, raw_data: Any) -> List[CanonicalPoliceUnitState]:
        pass

    def validate(self, state: CanonicalPoliceUnitState) -> Tuple[bool, List[str]]:
        flags = []
        is_valid = True

        if not state.unit_id:
            flags.append("MISSING_FIELD")
            is_valid = False

        if not (20.0 <= state.latitude <= 22.5) or not (78.0 <= state.longitude <= 80.5):
            flags.append("INVALID_COORDINATES")
            is_valid = False

        return is_valid, flags
