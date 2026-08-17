"""
Model loader adapter for FastAPI ML service.
"""

from typing import Any
from src.model_loader import (
    load_model as src_load_model,
    get_model_version as src_get_model_version,
    reset_model as src_reset_model,
)

def load_model() -> Any:
    """
    Load and return cached ML model.
    """
    return src_load_model()

def get_model_version() -> str:
    """
    Return model version string.
    """
    return src_get_model_version()

def reset_model() -> None:
    """
    Clear model cache.
    """
    src_reset_model()
