"""
Feature Assembler Module.
Combines historical features, junction metadata, and external adapter statuses
into canonical feature vector contracts.
"""

from typing import Any, Dict, Optional
from app.config import FEATURES

def assemble_model_features(
    historical_features: Dict[str, Any],
    canonical_junction_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Assemble exact feature dictionary ordered according to canonical model features:
    ['accidents_7d', 'accidents_30d', 'accidents_90d', 'accidents_1y',
     'fatal_accidents_1y', 'injury_accidents_1y', 'historical_accident_rate', 'junction']
    """
    junction_val = canonical_junction_name or historical_features.get("junction", "")

    assembled = {
        "accidents_7d": float(historical_features.get("accidents_7d", 0.0)),
        "accidents_30d": float(historical_features.get("accidents_30d", 0.0)),
        "accidents_90d": float(historical_features.get("accidents_90d", 0.0)),
        "accidents_1y": float(historical_features.get("accidents_1y", 0.0)),
        "fatal_accidents_1y": float(historical_features.get("fatal_accidents_1y", 0.0)),
        "injury_accidents_1y": float(historical_features.get("injury_accidents_1y", 0.0)),
        "historical_accident_rate": float(historical_features.get("historical_accident_rate", 0.0)),
        "junction": str(junction_val).strip(),
    }

    # Ensure feature ordering matches canonical FEATURES
    ordered_features = {feature: assembled[feature] for feature in FEATURES}
    return ordered_features

def assemble_full_pipeline_response(
    location_id: str,
    canonical_junction_name: str,
    historical_features: Dict[str, Any],
    adapter_statuses: Optional[Dict[str, str]] = None,
    data_source_provenance: str = "SIMULATED"
) -> Dict[str, Any]:
    """
    Produce structured pipeline feature output including metadata and data source statuses.
    """
    features = assemble_model_features(historical_features, canonical_junction_name)

    default_adapters = {
        "accidents": data_source_provenance,
        "traffic": "NOT_AVAILABLE",
        "incidents": "NOT_AVAILABLE",
        "parking": "NOT_AVAILABLE",
        "weather": "NOT_AVAILABLE",
        "events": "NOT_AVAILABLE",
    }
    if adapter_statuses:
        default_adapters.update(adapter_statuses)

    return {
        "location_id": location_id,
        "junction": canonical_junction_name,
        "features": features,
        "data_sources": default_adapters,
    }
