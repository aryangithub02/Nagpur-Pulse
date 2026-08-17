import sys
from pathlib import Path

# Ensure root directory is on sys.path so src module can be imported
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import (
    BASE_DIR,
    DATA_DIR,
    PROCESSED_DIR,
    MODELS_DIR,
    METRICS_DIR,
    MODEL_PATH,
    MODEL_VERSION,
    NUMERIC_FEATURES,
    CATEGORICAL_FEATURES,
    FEATURES,
    TARGET_CLASSES,
    CONFIDENCE_THRESHOLD,
    UNCERTAIN_LABEL,
    REQUIRED_FEATURES,
    validate_model_file,
)

# Service specific config
SERVICE_NAME = "nagpur-pulse-ml"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000

# ML Service Data Paths
ML_SERVICE_DIR = Path(__file__).resolve().parent.parent
ML_DATA_DIR = ML_SERVICE_DIR / "data"
ML_RAW_DATA_DIR = ML_DATA_DIR / "raw"
ML_REFERENCES_DIR = ML_DATA_DIR / "references"
ML_PROCESSED_DATA_DIR = ML_DATA_DIR / "processed"

RAW_ACCIDENTS_EXCEL_PATH = ML_RAW_DATA_DIR / "nagpur_accidents_2020_2025.xlsx"
FIRST_20_JUNCTIONS_PATH = ML_REFERENCES_DIR / "nagpur_first_20_junctions.json"
SECOND_20_JUNCTIONS_PATH = ML_REFERENCES_DIR / "nagpur_second_20_junctions.json"
PROCESSED_ACCIDENTS_CLEAN_PATH = ML_PROCESSED_DATA_DIR / "accidents_clean.csv"

