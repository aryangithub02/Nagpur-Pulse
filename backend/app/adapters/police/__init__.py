"""
Nagpur Pulse — Police Adapters Module.
"""

from .simulated import SimulatedPoliceAdapter
from .government import GovernmentPoliceAdapter

__all__ = [
    "SimulatedPoliceAdapter",
    "GovernmentPoliceAdapter",
]
