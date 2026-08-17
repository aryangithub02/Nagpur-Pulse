"""
Deterministic Data Cleaning Engine for Nagpur Pulse ML Service.
Performs duplicate removal, column normalization, ISO timestamp parsing,
outlier capping (IQR percentile clipping), and missing value imputation.
"""

from typing import Dict, Any, Tuple, Optional
import pandas as pd
import numpy as np
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("NagpurPulse.Cleaning")


def clean_and_normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Standardize all column names to lowercase snake_case.
    """
    df = df.copy()
    df.columns = (
        df.columns.str.strip()
        .str.lower()
        .str.replace(" ", "_")
        .str.replace("-", "_")
        .str.replace("/", "_")
    )
    return df


def remove_duplicate_records(df: pd.DataFrame, subset_cols: Optional[list] = None) -> Tuple[pd.DataFrame, int]:
    """
    Remove exact duplicate rows or duplicates based on specific key columns.
    """
    df = df.copy()
    initial_count = len(df)
    if subset_cols and all(c in df.columns for c in subset_cols):
        df = df.drop_duplicates(subset=subset_cols).reset_index(drop=True)
    else:
        df = df.drop_duplicates().reset_index(drop=True)
    
    removed = initial_count - len(df)
    logger.info(f"Removed {removed} duplicate rows (Initial: {initial_count}, Final: {len(df)})")
    return df, removed


def cap_outliers_iqr(df: pd.DataFrame, numeric_cols: list, factor: float = 3.0) -> Tuple[pd.DataFrame, int]:
    """
    Cap extreme numeric outliers using non-destructive IQR percentile clipping.
    Does NOT delete valid traffic records.
    """
    df = df.copy()
    outliers_capped = 0

    for col in numeric_cols:
        if col in df.columns and pd.api.types.is_numeric_dtype(df[col]):
            q1 = df[col].quantile(0.25)
            q3 = df[col].quantile(0.75)
            iqr = q3 - q1
            if iqr > 0:
                lower_bound = q1 - (factor * iqr)
                upper_bound = q3 + (factor * iqr)
                
                # Check negative values for count/speed features
                if lower_bound < 0 and col in ["injuredcount", "fatalitycount", "vehiclesinvolved", "vehicle_count", "accidents_7d", "accidents_30d"]:
                    lower_bound = 0

                mask_outliers = (df[col] < lower_bound) | (df[col] > upper_bound)
                capped_count = int(mask_outliers.sum())
                if capped_count > 0:
                    outliers_capped += capped_count
                    df[col] = df[col].clip(lower=lower_bound, upper=upper_bound)
                    logger.info(f"Capped {capped_count} outliers in '{col}' to bounds [{lower_bound:.2f}, {upper_bound:.2f}]")

    return df, outliers_capped


def clean_accidents_dataset(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Clean historical accident dataset deterministically.
    """
    logger.info("Starting accident dataset cleaning pipeline...")
    df = clean_and_normalize_columns(df)

    # 1. Remove duplicates
    duplicate_col = ["accidentid"] if "accidentid" in df.columns else None
    df, dups_removed = remove_duplicate_records(df, subset_cols=duplicate_col)

    # 2. Date parsing
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.dropna(subset=["date"]).reset_index(drop=True)

    # 3. Text field standardization
    string_cols = ["junction", "severity", "primaryvehicletype", "probablecause", "weathercondition"]
    for col in string_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.upper()
            df[col] = df[col].replace({"NAN": "UNKNOWN", "NONE": "UNKNOWN", "": "UNKNOWN"})

    # 4. Numeric fields cleaning and non-negative bounds
    numeric_cols = ["injuredcount", "injured_count", "fatalitycount", "fatality_count", "vehiclesinvolved", "vehicles_involved"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
            df[col] = np.maximum(0, df[col])

    # 5. Outlier capping
    df, capped_count = cap_outliers_iqr(df, numeric_cols, factor=3.0)

    audit_summary = {
        "dataset": "accidents",
        "clean_rows": len(df),
        "duplicates_removed": dups_removed,
        "outliers_capped": capped_count,
    }
    logger.info(f"Accidents dataset cleaning completed: {len(df)} clean records.")
    return df, audit_summary
