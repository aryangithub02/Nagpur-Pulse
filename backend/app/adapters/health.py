"""
Nagpur Pulse — Provider Health Monitoring Service.
Tracks provider availability, latency, success rates, and staleness metrics across all adapters.
"""

import time
import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger("provider_health")


class ProviderHealthService:
    """
    In-memory operational health tracking for external data adapters.
    """

    def __init__(self):
        self._health: Dict[str, Dict[str, Any]] = {
            "traffic": {
                "provider": "SIMULATED",
                "status": "HEALTHY",
                "last_success_at": datetime.utcnow().isoformat(),
                "last_failure_at": None,
                "latency_ms": 0.0,
                "consecutive_failures": 0,
                "requests_total": 0,
                "requests_failed": 0,
            },
            "weather": {
                "provider": "OPENWEATHER",
                "status": "HEALTHY",
                "last_success_at": datetime.utcnow().isoformat(),
                "last_failure_at": None,
                "latency_ms": 0.0,
                "consecutive_failures": 0,
                "requests_total": 0,
                "requests_failed": 0,
            },
            "police": {
                "provider": "SIMULATED",
                "status": "HEALTHY",
                "last_success_at": datetime.utcnow().isoformat(),
                "last_failure_at": None,
                "latency_ms": 0.0,
                "consecutive_failures": 0,
                "requests_total": 0,
                "requests_failed": 0,
            },
            "routing": {
                "provider": "TOMTOM",
                "status": "HEALTHY",
                "last_success_at": datetime.utcnow().isoformat(),
                "last_failure_at": None,
                "latency_ms": 0.0,
                "consecutive_failures": 0,
                "requests_total": 0,
                "requests_failed": 0,
            },
        }

    def record_success(self, category: str, provider: str, latency_ms: float = 0.0):
        if category not in self._health:
            self._health[category] = {}

        h = self._health[category]
        h["provider"] = provider
        h["status"] = "HEALTHY"
        h["last_success_at"] = datetime.utcnow().isoformat()
        h["latency_ms"] = round(latency_ms, 1)
        h["consecutive_failures"] = 0
        h["requests_total"] = h.get("requests_total", 0) + 1

    def record_failure(self, category: str, provider: str, error_msg: str):
        if category not in self._health:
            self._health[category] = {}

        h = self._health[category]
        h["provider"] = provider
        h["last_failure_at"] = datetime.utcnow().isoformat()
        h["consecutive_failures"] = h.get("consecutive_failures", 0) + 1
        h["last_error"] = error_msg
        h["requests_total"] = h.get("requests_total", 0) + 1
        h["requests_failed"] = h.get("requests_failed", 0) + 1

        if h["consecutive_failures"] >= 3:
            h["status"] = "DEGRADED"
        if h["consecutive_failures"] >= 5:
            h["status"] = "UNHEALTHY"

    def get_health_summary(self) -> Dict[str, Any]:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "providers": self._health,
        }


provider_health_service = ProviderHealthService()
