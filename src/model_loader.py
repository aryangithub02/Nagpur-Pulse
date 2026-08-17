"""
NAGPUR PULSE - MODEL LOADER

Loads the calibrated ML model and keeps a single cached instance.
"""

from pathlib import Path
from typing import Any, Optional

import joblib

from .config import MODEL_PATH, MODEL_VERSION


# ============================================================================
# MODEL CACHE
# ============================================================================

_MODEL: Optional[Any] = None


# ============================================================================
# LOAD MODEL
# ============================================================================

def load_model() -> Any:
    """
    Load the calibrated ML model.

    The model is loaded only once and then cached.

    Returns:
        Loaded sklearn model.
    """

    global _MODEL

    if _MODEL is not None:
        return _MODEL

    model_path = Path(MODEL_PATH)

    print(f"Loading ML model: {model_path}")

    if not model_path.exists():
        raise FileNotFoundError(
            f"ML model not found: {model_path}"
        )

    try:
        _MODEL = joblib.load(model_path)
    except Exception as exc:
        raise RuntimeError(
            f"Failed to load ML model: {exc}"
        ) from exc

    print("ML model loaded successfully.")

    return _MODEL


# ============================================================================
# MODEL VERSION
# ============================================================================

def get_model_version() -> str:
    """
    Return configured model version.
    """

    return MODEL_VERSION


# ============================================================================
# RESET MODEL
# ============================================================================

def reset_model() -> None:
    """
    Clear cached model.

    Useful for tests.
    """

    global _MODEL

    _MODEL = None


# ============================================================================
# TEST
# ============================================================================

def main() -> None:

    print("=" * 70)
    print("NAGPUR PULSE - MODEL LOADER TEST")
    print("=" * 70)

    print(f"\nLoading ML model: {MODEL_PATH}")

    model1 = load_model()

    print("\nModel type:")
    print(type(model1))

    print("\nModel version:")
    print(MODEL_VERSION)

    print("\nModel object loaded successfully.")

    model2 = load_model()

    print("\nSame model object:", model1 is model2)

    if model1 is not model2:
        raise RuntimeError(
            "Model cache test failed."
        )

    print("\nMODEL LOADER TEST PASSED")


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()