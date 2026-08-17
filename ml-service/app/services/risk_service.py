"""
Risk service handling model inspection and prediction business logic.
"""

from typing import Any, Dict
from app.model_loader import load_model, get_model_version
from app.predictor import predict_risk

def get_model_info() -> Dict[str, Any]:
    """
    Retrieve model version, dynamic class name, and status.
    Raises exception if model fails to load.
    """
    model = load_model()
    model_type = type(model).__name__
    version = get_model_version()

    return {
        "model_version": version,
        "model_type": model_type,
        "status": "loaded"
    }

def predict_traffic_risk(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pass input dictionary to predictor module and return prediction contract.
    """
    return predict_risk(data)
