from pathlib import Path


# ============================================================
# NAGPUR PULSE - ML CONFIGURATION
# ============================================================

# Project root
BASE_DIR = Path(__file__).resolve().parent.parent


# ============================================================
# DIRECTORIES
# ============================================================

DATA_DIR = BASE_DIR / "data"
PROCESSED_DIR = DATA_DIR / "processed"

MODELS_DIR = BASE_DIR / "models"
METRICS_DIR = BASE_DIR / "metrics"


# ============================================================
# MODEL
# ============================================================

MODEL_PATH = MODELS_DIR / "xgboost_calibrated_v1.joblib"

MODEL_VERSION = "traffic-risk-v1"


# ============================================================
# FEATURES
# ============================================================

NUMERIC_FEATURES = [
    "accidents_7d",
    "accidents_30d",
    "accidents_90d",
    "accidents_1y",
    "fatal_accidents_1y",
    "injury_accidents_1y",
    "historical_accident_rate",
]

CATEGORICAL_FEATURES = [
    "junction",
]

FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


# ============================================================
# TARGET CLASSES
# ============================================================

TARGET_CLASSES = [
    "LOW",
    "MEDIUM",
    "HIGH",
]


# ============================================================
# CONFIDENCE
# ============================================================

CONFIDENCE_THRESHOLD = 0.50

UNCERTAIN_LABEL = "UNCERTAIN"


# ============================================================
# VALIDATION
# ============================================================

REQUIRED_FEATURES = FEATURES


# ============================================================
# MODEL FILE CHECK
# ============================================================

def validate_model_file():
    """
    Check whether the calibrated model exists.
    """

    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Calibrated model not found: {MODEL_PATH}"
        )

    return True


if __name__ == "__main__":

    print("=" * 70)
    print("NAGPUR PULSE - ML CONFIGURATION CHECK")
    print("=" * 70)

    print(f"Project directory : {BASE_DIR}")
    print(f"Model path        : {MODEL_PATH}")
    print(f"Model version     : {MODEL_VERSION}")

    print("\nFeatures:")
    for feature in FEATURES:
        print(f" - {feature}")

    print("\nTarget classes:")
    for target in TARGET_CLASSES:
        print(f" - {target}")

    print(f"\nConfidence threshold: {CONFIDENCE_THRESHOLD}")

    print("\nChecking model...")

    if MODEL_PATH.exists():
        print("OK: calibrated model found")
    else:
        print("ERROR: calibrated model NOT found")

    print("\nConfiguration check complete.")