"""
Data pipeline validators.
"""

from typing import Any, Dict, List, Tuple
import numpy as np
import pandas as pd

ALLOWED_DATA_SOURCES = {"SIMULATED", "HISTORICAL", "EXTERNAL"}
REQUIRED_ACCIDENT_COLUMNS = [
    "accidentid",
    "date",
    "junction",
    "severity",
    "injuredcount",
    "fatalitycount",
    "vehiclesinvolved",
    "data_source",
    "is_simulated",
]

def validate_accident_record(record: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate a single accident record dictionary.
    Returns (is_valid, list_of_errors).
    """
    errors = []

    # Check required fields
    for col in ["accidentid", "date", "junction", "severity"]:
        if col not in record or record[col] is None or str(record[col]).strip() == "":
            errors.append(f"Missing required field: '{col}'")

    # Validate provenance
    source = record.get("data_source")
    if source not in ALLOWED_DATA_SOURCES:
        errors.append(f"Invalid data_source '{source}'. Allowed: {ALLOWED_DATA_SOURCES}")

    if not isinstance(record.get("is_simulated"), bool):
        errors.append("Field 'is_simulated' must be a boolean.")

    # Validate non-negative numbers
    for num_col in ["injuredcount", "fatalitycount", "vehiclesinvolved"]:
        if num_col in record:
            val = record[num_col]
            if isinstance(val, bool):
                errors.append(f"Invalid numeric value for '{num_col}': {val}")
                continue
            try:
                num = float(val)
                if not np.isfinite(num):
                    errors.append(f"Non-finite value for '{num_col}': {val}")
                elif num < 0:
                    errors.append(f"Negative count for '{num_col}': {num}")
            except (ValueError, TypeError):
                errors.append(f"Invalid numeric value for '{num_col}': {val}")

    return len(errors) == 0, errors

def audit_accident_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    """
    Generate a comprehensive data quality audit report for an accident DataFrame.
    """
    report: Dict[str, Any] = {
        "total_records": len(df),
        "valid_records": 0,
        "invalid_records": 0,
        "duplicate_records": 0,
        "missing_values": {},
        "invalid_dates": 0,
        "invalid_numeric_values": 0,
        "data_source_distribution": {},
        "errors": []
    }

    if df.empty:
        return report

    # Duplicate accident IDs
    if "accidentid" in df.columns:
        report["duplicate_records"] = int(df.duplicated(subset=["accidentid"]).sum())

    # Missing values per column
    for col in df.columns:
        missing_count = int(df[col].isna().sum())
        if missing_count > 0:
            report["missing_values"][col] = missing_count

    # Data source distribution
    if "data_source" in df.columns:
        dist = df["data_source"].value_counts().to_dict()
        report["data_source_distribution"] = {str(k): int(v) for k, v in dist.items()}

    # Check dates
    if "date" in df.columns:
        invalid_dates = df["date"].isna().sum()
        report["invalid_dates"] = int(invalid_dates)

    # Check negative numeric values
    num_errors = 0
    for col in ["injuredcount", "fatalitycount", "vehiclesinvolved"]:
        if col in df.columns:
            invalid_num = ((df[col] < 0) | (~np.isfinite(df[col]))).sum()
            num_errors += int(invalid_num)
    report["invalid_numeric_values"] = num_errors

    # Valid vs Invalid row counts
    critical_subset = [c for c in ["accidentid", "date", "junction"] if c in df.columns]
    valid_mask = df[critical_subset].notna().all(axis=1) if critical_subset else pd.Series(True, index=df.index)
    if "date" in df.columns:
        valid_mask &= df["date"].notna()

    report["valid_records"] = int(valid_mask.sum())
    report["invalid_records"] = len(df) - report["valid_records"]

    return report
