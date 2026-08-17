"""
Nagpur Pulse — Traffic Adapter Factory.
Instantiates the configured TrafficAdapter without exposing provider details to domain services.
"""

import logging
from app.adapters.base.traffic import TrafficAdapter
from app.adapters.traffic.tomtom import TomTomTrafficAdapter
from app.adapters.traffic.simulated import SimulatedTrafficAdapter
from app.adapters.traffic.government import GovernmentTrafficAdapter
from app.config import settings

logger = logging.getLogger("adapter.traffic.factory")


class TrafficAdapterFactory:
    """
    Factory creating the active TrafficAdapter based on environment configuration.
    """

    @staticmethod
    def create(provider_name: str = None) -> TrafficAdapter:
        selected = (provider_name or settings.providers.traffic_provider or "simulated").strip().lower()

        if selected == "tomtom":
            logger.debug("Instantiating TomTomTrafficAdapter")
            return TomTomTrafficAdapter()
        elif selected == "government":
            logger.debug("Instantiating GovernmentTrafficAdapter")
            return GovernmentTrafficAdapter()
        else:
            logger.debug("Instantiating SimulatedTrafficAdapter")
            return SimulatedTrafficAdapter()
