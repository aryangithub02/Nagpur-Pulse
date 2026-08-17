"""
Nagpur Pulse — Weather Adapters Module.
"""

from .openweather import OpenWeatherAdapter
from .simulated import SimulatedWeatherAdapter

__all__ = [
    "OpenWeatherAdapter",
    "SimulatedWeatherAdapter",
]
