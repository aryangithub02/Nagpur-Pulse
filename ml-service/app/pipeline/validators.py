"""
Comprehensive Data Quality Validator for Nagpur Pulse ML Service.
Audits datasets for missing values, duplicates, invalid numerical values,
impossible coordinates, and date/timestamp errors.
"""

from typing import Any, Dict, List, Tuple
import numpy as np
import pandas as pd

# Geographical bounding box for Nagpur City
NAGPUR_LAT_MIN = 21.00
NAGPUR_LAT_MAX = 21.30
NAGPUR_LON_MIN = 79.00
NAGPUR_LON_MAX = 79.30

ALLOWED_DATA_SOURCES = {"SIMULATED", "HISTORICAL", "EXTERNAL"}


def validate_coordinates(lat: float, lon: float) -> bool:
    """
    Check whether lat/lon coordinates fall within valid Nagpur geographical bounds.
    """
    if pd.isna(lat) or pd.isna(lon):
        return False
    try:
        lat_f = float(lat)
        lon_f = float(lon)
        return (NAGPUR_LAT_MIN <= lat_f <= NAGPUR_LAT_MAX) and (NAGPUR_LON_MIN <= lon_f <= NAGPUR_LON_MAX)
    except (ValueError, TypeError):
        return False


def audit_dataframe_quality(df: pd.DataFrame, dataset_name: str = "dataset") -> Dict[str, Any]:
    """
    Generate a detailed data-quality report for any input pandas DataFrame.
    """
    report: Dict[str, Any] = {
        "dataset_name": dataset_name,
        "total_rows": len(df),
        "total_columns": len(df.columns),
        "columns": list(df.columns),
        "missing_value_counts": {},
        "duplicate_rows_count": 0,
        "categorical_uniques": {},
        "numerical_summary": {},
        "invalid_value_counts": {
            "negative_counts": 0,
            "negative_speeds": 0,
            "invalid_dates": 0,
            "invalid_coordinates": 0,
        },
    }

    if df.empty:
        return report

    # 1. Duplicates check
    report["duplicate_rows_count"] = int(df.duplicated().sum())

    # 2. Missing values per column
    for col in df.columns:
        missing_cnt = int(df[col].isna().sum())
        if missing_cnt > 0:
            report["missing_value_counts"][col] = missing_cnt

    # 3. Categorical uniques and Numerical summary
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            report["numerical_summary"][col] = {
                "min": float(df[col].min()) if not df[col].empty and not df[col].dropna().empty else None,
                "max": float(df[col].max()) if not df[col].empty and not df[col].dropna().empty else None,
                "mean": float(df[col].mean()) if not df[col].empty and not df[col].dropna().empty else None,
            }
            # Impossible negative numerical checks
            neg_count = int((df[col] < 0).sum())
            if neg_count > 0:
                report["invalid_value_counts"]["negative_counts"] += neg_count
        else:
            uniques = df[col].dropna().unique()
            if len(uniques) <= 30:
                report["categorical_uniques"][col] = [str(x) for x in uniques]
            else:
                report["categorical_uniques"][col] = f"{len(uniques)} unique values"

    # 4. Check coordinates if present
    if "latitude" in df.columns and "longitude" in df.columns:
        invalid_coords = 0
        for lat, lon in zip(df["latitude"], df["longitude"]):
            if not validate_coordinates(lat, lon):
                invalid_coords += 1
        report["invalid_value_counts"]["invalid_coordinates"] = invalid_coords

    # 5. Check date parsing if present
    for date_col in ["date", "Date", "observation_date", "period_date"]:
        if date_col in df.columns:
            parsed = pd.to_datetime(df[date_col], errors="coerce")
            invalid_dates = int(parsed.isna().sum())
            report["invalid_value_counts"]["invalid_dates"] += invalid_dates

    return report


def audit_accident_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
    return audit_dataframe_quality(df, dataset_name="accident_log")


def validate_accident_record(record: Dict[str, Any]) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    if not record.get("junction"):
        errors.append("Junction name is required")
    if record.get("injuredcount", 0) < 0:
        errors.append("Injured count cannot be negative")
    if record.get("fatalitycount", 0) < 0:
        errors.append("Fatality count cannot be negative")
    source = record.get("data_source", "SIMULATED")
    if source not in ALLOWED_DATA_SOURCES:
        errors.append(f"Invalid data source '{source}'")
    if not isinstance(record.get("is_simulated"), bool):
        errors.append("is_simulated must be boolean")
    return len(errors) == 0, errors


