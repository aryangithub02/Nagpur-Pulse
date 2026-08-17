"""
NAGPUR PULSE - PREDICTOR
Prediction service for traffic accident risk classification.
"""

from typing import Any, Dict

import numpy as np
import pandas as pd

from .config import (
    FEATURES,
    TARGET_CLASSES,
    CONFIDENCE_THRESHOLD,
    MODEL_VERSION,
)
from .model_loader import load_model


# ============================================================================
# CONSTANTS
# ============================================================================

NUMERIC_FEATURES = [
    "accidents_7d",
    "accidents_30d",
    "accidents_90d",
    "accidents_1y",
    "fatal_accidents_1y",
    "injury_accidents_1y",
    "historical_accident_rate",
]

JUNCTION_FEATURE = "junction"


# ============================================================================
# INPUT VALIDATION
# ============================================================================

def validate_input(data: Dict[str, Any]) -> None:
    """
    Validate prediction input.

    Raises:
        ValueError: if input is invalid.
    """

    if not isinstance(data, dict):
        raise ValueError("Input must be a dictionary.")

    # ------------------------------------------------------------------------
    # Check missing features
    # ------------------------------------------------------------------------

    missing_features = [
        feature for feature in FEATURES
        if feature not in data
    ]

    if missing_features:
        raise ValueError(
            f"Missing required features: {', '.join(missing_features)}"
        )

    # ------------------------------------------------------------------------
    # Check unexpected features
    # ------------------------------------------------------------------------

    unexpected_features = [
        key for key in data
        if key not in FEATURES
    ]

    if unexpected_features:
        raise ValueError(
            f"Unexpected feature(s): {', '.join(unexpected_features)}"
        )

    # ------------------------------------------------------------------------
    # Validate numeric features
    # ------------------------------------------------------------------------

    for feature in NUMERIC_FEATURES:

        value = data[feature]

        # Reject bool
        if isinstance(value, bool):
            raise ValueError(
                f"Invalid numeric value for {feature}: {value}"
            )

        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            raise ValueError(
                f"Invalid numeric value for {feature}: {value}"
            )

        # Reject NaN / infinity
        if not np.isfinite(numeric_value):
            raise ValueError(
                f"Invalid numeric value for {feature}: {value}"
            )

        # Reject negative values
        if numeric_value < 0:
            raise ValueError(
                f"Value for {feature} cannot be negative: {numeric_value}"
            )

    # ------------------------------------------------------------------------
    # Validate junction
    # ------------------------------------------------------------------------

    junction = data[JUNCTION_FEATURE]

    if not isinstance(junction, str):
        raise ValueError("Junction must be a string.")

    if not junction.strip():
        raise ValueError("Junction cannot be empty.")


# ============================================================================
# DATA PREPARATION
# ============================================================================

def prepare_input(data: Dict[str, Any]) -> pd.DataFrame:
    """
    Convert validated dictionary into DataFrame expected by ML pipeline.
    """

    row = {}

    for feature in FEATURES:

        if feature == JUNCTION_FEATURE:
            row[feature] = str(data[feature]).strip()

        else:
            row[feature] = float(data[feature])

    return pd.DataFrame([row], columns=FEATURES)


# ============================================================================
# PROBABILITY NORMALIZATION
# ============================================================================

def get_probability_mapping(
    model: Any,
    probabilities: np.ndarray,
) -> Dict[str, float]:
    """
    Convert model probability output into:

        LOW
        MEDIUM
        HIGH
    """

    probabilities = np.asarray(
        probabilities,
        dtype=float
    ).reshape(-1)

    # ------------------------------------------------------------------------
    # Determine model classes
    # ------------------------------------------------------------------------

    if hasattr(model, "classes_"):
        model_classes = list(model.classes_)
    else:
        model_classes = list(range(len(probabilities)))

    result = {
        "LOW": 0.0,
        "MEDIUM": 0.0,
        "HIGH": 0.0,
    }

    # Numeric encoded classes
    numeric_mapping = {
        0: "LOW",
        1: "MEDIUM",
        2: "HIGH",
    }

    for index, class_value in enumerate(model_classes):

        if index >= len(probabilities):
            continue

        probability = float(probabilities[index])

        # String class
        if isinstance(class_value, str):
            class_name = class_value.upper()

        else:
            try:
                class_name = numeric_mapping[int(class_value)]
            except (ValueError, KeyError, TypeError):
                continue

        if class_name in result:
            result[class_name] = probability

    return result


# ============================================================================
# PREDICTION
# ============================================================================

def predict_risk(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate traffic risk prediction.

    Returns:
        {
            "risk_level": "LOW" | "MEDIUM" | "HIGH" | "UNCERTAIN",
            "confidence": float,
            "model_version": str,
            "probabilities": {
                "LOW": float,
                "MEDIUM": float,
                "HIGH": float
            }
        }
    """

    # ------------------------------------------------------------------------
    # Validate input
    # ------------------------------------------------------------------------

    validate_input(data)

    # ------------------------------------------------------------------------
    # Load model
    # ------------------------------------------------------------------------

    model = load_model()

    # ------------------------------------------------------------------------
    # Prepare DataFrame
    # ------------------------------------------------------------------------

    X = prepare_input(data)

    # ------------------------------------------------------------------------
    # Generate probabilities
    # ------------------------------------------------------------------------

    if not hasattr(model, "predict_proba"):
        raise RuntimeError(
            "Loaded model does not support probability prediction."
        )

    probability_matrix = model.predict_proba(X)

    if probability_matrix is None:
        raise RuntimeError(
            "Model returned no probability output."
        )

    probabilities = np.asarray(
        probability_matrix[0],
        dtype=float
    )

    # ------------------------------------------------------------------------
    # Convert probabilities to class mapping
    # ------------------------------------------------------------------------

    probability_mapping = get_probability_mapping(
        model,
        probabilities
    )

    # ------------------------------------------------------------------------
    # Determine highest probability
    # ------------------------------------------------------------------------

    predicted_class = max(
        probability_mapping,
        key=probability_mapping.get
    )

    confidence = float(
        probability_mapping[predicted_class]
    )

    # ------------------------------------------------------------------------
    # Confidence threshold
    # ------------------------------------------------------------------------

    if confidence >= CONFIDENCE_THRESHOLD:
        risk_level = predicted_class
    else:
        risk_level = "UNCERTAIN"

    # ------------------------------------------------------------------------
    # Return result
    # ------------------------------------------------------------------------

    return {
        "risk_level": risk_level,
        "confidence": round(confidence, 4),
        "model_version": MODEL_VERSION,
        "probabilities": {
            "LOW": round(
                probability_mapping["LOW"],
                4
            ),
            "MEDIUM": round(
                probability_mapping["MEDIUM"],
                4
            ),
            "HIGH": round(
                probability_mapping["HIGH"],
                4
            ),
        },
    }


# ============================================================================
# COMMAND LINE TEST
# ============================================================================

def main() -> None:

    print("=" * 70)
    print("NAGPUR PULSE - PREDICTOR TEST")
    print("=" * 70)

    sample_input = {
        "accidents_7d": 2,
        "accidents_30d": 8,
        "accidents_90d": 21,
        "accidents_1y": 75,
        "fatal_accidents_1y": 3,
        "injury_accidents_1y": 28,
        "historical_accident_rate": 6.25,
        "junction": "Sitabuldi Chowk",
    }

    print("\nINPUT")
    print("-" * 70)

    for key, value in sample_input.items():
        print(f"{key}: {value}")

    print("\nGENERATING PREDICTION...")
    print("-" * 70)

    try:

        result = predict_risk(sample_input)

        print("\nPREDICTION RESULT")
        print("-" * 70)

        print(
            f"Risk level : {result['risk_level']}"
        )

        print(
            f"Confidence : {result['confidence']:.4f}"
        )

        print(
            f"Model      : {result['model_version']}"
        )

        print("\nProbabilities:")

        print(
            f"  LOW    : {result['probabilities']['LOW']:.4f}"
        )

        print(
            f"  MEDIUM : {result['probabilities']['MEDIUM']:.4f}"
        )

        print(
            f"  HIGH   : {result['probabilities']['HIGH']:.4f}"
        )

        print("\n" + "=" * 70)
        print("PREDICTOR TEST PASSED")
        print("=" * 70)

    except Exception as exc:

        print("\nPREDICTOR TEST FAILED")
        print("-" * 70)
        print(type(exc).__name__ + ":", exc)

        raise


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    main()