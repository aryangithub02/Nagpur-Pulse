"""
Nagpur Pulse — Base Weather Adapter Interface.
All weather adapters (OpenWeather, Simulated, Government) must implement this contract.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Tuple, List
from app.adapters.schemas.weather import CanonicalWeatherState


class WeatherAdapter(ABC):
    """
    Abstract Base Class for Weather Data Adapters.
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
    def fetch_current(self) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def normalize_current(self, raw_data: Dict[str, Any]) -> CanonicalWeatherState:
        pass

    def validate(self, state: CanonicalWeatherState) -> Tuple[bool, List[str]]:
        flags = []
        is_valid = True

        if state.temperature_c < -10.0 or state.temperature_c > 60.0:
            flags.append("OUT_OF_RANGE")
            is_valid = False

        if state.humidity_percent < 0.0 or state.humidity_percent > 100.0:
            flags.append("OUT_OF_RANGE")
            is_valid = False

        if state.precipitation_mm < 0.0:
            flags.append("OUT_OF_RANGE")
            is_valid = False

        if state.visibility_km < 0.0:
            flags.append("OUT_OF_RANGE")
            is_valid = False

        return is_valid, flags
