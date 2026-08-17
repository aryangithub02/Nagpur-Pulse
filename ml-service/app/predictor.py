"""
Predictor adapter for FastAPI ML service.
"""

from typing import Any, Dict
from src.predictor import predict_risk as src_predict_risk

def predict_risk(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute risk prediction via canonical predictor module.
    """
    return src_predict_risk(data)
