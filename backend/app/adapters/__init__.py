"""
Nagpur Pulse — Integration-Ready Adapter Layer.
"""

from .schemas import (
    DataProvenance,
    QualityFlag,
    AdapterError,
    CanonicalTrafficState,
    CanonicalWeatherState,
    CanonicalPoliceUnitState,
    CanonicalRouteResult,
)
from .traffic import (
    TrafficAdapterFactory,
    TomTomTrafficAdapter,
    SimulatedTrafficAdapter,
    GovernmentTrafficAdapter,
)
from .weather import (
    OpenWeatherAdapter,
    SimulatedWeatherAdapter,
)
from .police import (
    SimulatedPoliceAdapter,
    GovernmentPoliceAdapter,
)
from .routing import (
    TomTomRoutingAdapter,
    SimulatedRoutingAdapter,
)
from .health import (
    provider_health_service,
)

__all__ = [
    "DataProvenance",
    "QualityFlag",
    "AdapterError",
    "CanonicalTrafficState",
    "CanonicalWeatherState",
    "CanonicalPoliceUnitState",
    "CanonicalRouteResult",
    "TrafficAdapterFactory",
    "TomTomTrafficAdapter",
    "SimulatedTrafficAdapter",
    "GovernmentTrafficAdapter",
    "OpenWeatherAdapter",
    "SimulatedWeatherAdapter",
    "SimulatedPoliceAdapter",
    "GovernmentPoliceAdapter",
    "TomTomRoutingAdapter",
    "SimulatedRoutingAdapter",
    "provider_health_service",
]
