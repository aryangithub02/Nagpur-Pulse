"""
Nagpur Pulse — Canonical Data Provenance & Quality Schemas.
Every external data object carries this provenance, independent of which provider produced it.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional
from dataclasses import dataclass, field


class QualityFlag(str, Enum):
    """Standard quality flags for canonical data objects."""
    MISSING_FIELD = "MISSING_FIELD"
    STALE_DATA = "STALE_DATA"
    INVALID_COORDINATES = "INVALID_COORDINATES"
    LOW_CONFIDENCE = "LOW_CONFIDENCE"
    PROVIDER_TIMEOUT = "PROVIDER_TIMEOUT"
    PROVIDER_ERROR = "PROVIDER_ERROR"
    OUT_OF_RANGE = "OUT_OF_RANGE"
    DUPLICATE_RECORD = "DUPLICATE_RECORD"
    SPATIAL_MAPPING_FAILED = "SPATIAL_MAPPING_FAILED"
    TIMESTAMP_MISSING = "TIMESTAMP_MISSING"
    PROVIDER_NOT_CONFIGURED = "PROVIDER_NOT_CONFIGURED"
    USING_FALLBACK = "USING_FALLBACK"
    USING_CACHED = "USING_CACHED"


class AdapterErrorType(str, Enum):
    """Standardized adapter error types — decoupled from provider specifics."""
    PROVIDER_TIMEOUT = "PROVIDER_TIMEOUT"
    PROVIDER_UNAVAILABLE = "PROVIDER_UNAVAILABLE"
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR"
    RATE_LIMITED = "RATE_LIMITED"
    INVALID_RESPONSE = "INVALID_RESPONSE"
    SCHEMA_MISMATCH = "SCHEMA_MISMATCH"
    NORMALIZATION_ERROR = "NORMALIZATION_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    SPATIAL_MAPPING_ERROR = "SPATIAL_MAPPING_ERROR"
    PROVIDER_NOT_CONFIGURED = "PROVIDER_NOT_CONFIGURED"


class SourceType(str, Enum):
    """Data source classification."""
    EXTERNAL = "EXTERNAL"
    INTERNAL = "INTERNAL"
    SIMULATED = "SIMULATED"
    CACHED = "CACHED"
    FALLBACK = "FALLBACK"


@dataclass
class DataProvenance:
    """
    Immutable provenance record attached to every canonical data object.
    Answers: Where did this data come from? When? How fresh? How reliable?
    """
    source_type: str                     # EXTERNAL / SIMULATED / CACHED
    source_provider: str                 # TOMTOM / OPENWEATHER / SIMULATED / GOVERNMENT
    observed_at: str                     # ISO8601 when the data was observed
    received_at: str                     # ISO8601 when we received it
    spatial_id: str = ""                 # Internal Nagpur Pulse junction/location ID
    quality_score: float = 1.0           # 0.0–1.0 data quality (NOT risk score)
    quality_flags: List[str] = field(default_factory=list)
    adapter_version: str = "1.0.0"
    provider_api_version: str = ""
    raw_reference_id: str = ""

    def to_dict(self):
        return {
            "source_type": self.source_type,
            "source_provider": self.source_provider,
            "observed_at": self.observed_at,
            "received_at": self.received_at,
            "spatial_id": self.spatial_id,
            "quality_score": self.quality_score,
            "quality_flags": self.quality_flags,
            "adapter_version": self.adapter_version,
        }


@dataclass
class AdapterError:
    """Standardized error from any provider adapter."""
    error_type: str
    provider: str
    message: str
    retryable: bool = True
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())

    def to_dict(self):
        return {
            "error_type": self.error_type,
            "provider": self.provider,
            "message": self.message,
            "retryable": self.retryable,
            "timestamp": self.timestamp,
        }


def now_iso() -> str:
    return datetime.utcnow().isoformat() + "Z"


def make_degraded_provenance(provider: str, flags: List[str] = None) -> DataProvenance:
    """Helper: build a low-quality provenance record for fallback/degraded states."""
    ts = now_iso()
    return DataProvenance(
        source_type=SourceType.FALLBACK,
        source_provider=provider,
        observed_at=ts,
        received_at=ts,
        quality_score=0.3,
        quality_flags=flags or [QualityFlag.PROVIDER_NOT_CONFIGURED],
    )
