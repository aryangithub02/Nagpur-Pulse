"""
CLI Script: Validate Raw & Processed Datasets.
Usage:
    python scripts/validate_dataset.py
"""

import sys
import json
from pathlib import Path
import pandas as pd

# Ensure ml-service root is in sys.path
SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.config import PROCESSED_ACCIDENTS_CLEAN_PATH, RAW_ACCIDENTS_EXCEL_PATH
from app.pipeline.accident_ingestion import ingest_historical_accidents
from app.pipeline.validators import audit_accident_dataframe

def main():
    print("=" * 70)
    print("NAGPUR PULSE - DATASET VALIDATION REPORT")
    print("=" * 70)

    if not RAW_ACCIDENTS_EXCEL_PATH.exists():
        print(f"ERROR: Raw dataset missing at {RAW_ACCIDENTS_EXCEL_PATH}")
        sys.exit(1)

    print("\nRunning ingestion and validation audit...")
    df, report = ingest_historical_accidents()

    print("\nDATA QUALITY REPORT SUMMARY:")
    print("-" * 70)
    print(json.dumps(report, indent=2))

    has_critical_error = False

    if report["invalid_records"] > 0:
        print(f"\nWARNING: {report['invalid_records']} invalid records detected.")

    if report["invalid_numeric_values"] > 0:
        print(f"\nERROR: {report['invalid_numeric_values']} invalid negative/non-finite numeric values detected.")
        has_critical_error = True

    if report["invalid_dates"] > 0:
        print(f"\nERROR: {report['invalid_dates']} invalid date values detected.")
        has_critical_error = True

    print("\n" + "=" * 70)
    if has_critical_error:
        print("VALIDATION AUDIT FAILED")
        print("=" * 70)
        sys.exit(1)
    else:
        print("VALIDATION AUDIT PASSED")
        print("=" * 70)

if __name__ == "__main__":
    main()
