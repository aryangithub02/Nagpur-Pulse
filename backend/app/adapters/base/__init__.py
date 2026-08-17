"""
Nagpur Pulse — Adapter Base Interfaces.
"""

from .traffic import TrafficAdapter
from .weather import WeatherAdapter
from .police import PoliceAdapter
from .routing import RoutingAdapter

__all__ = [
    "TrafficAdapter",
    "WeatherAdapter",
    "PoliceAdapter",
    "RoutingAdapter",
]
