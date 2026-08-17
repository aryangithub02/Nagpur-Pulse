"""
Historical Accident Ingestion Pipeline.
Reads Excel data, normalizes columns, validates schemas, attaches provenance metadata,
and produces processed accident datasets.
"""

from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import pandas as pd
import numpy as np

from app.config import RAW_ACCIDENTS_EXCEL_PATH, PROCESSED_ACCIDENTS_CLEAN_PATH
from app.pipeline.validators import audit_accident_dataframe

DEFAULT_COLUMN_MAPPING = {
    "accidentid": "accidentid",
    "date": "date",
    "time": "time",
    "junction": "junction",
    "severity": "severity",
    "primaryvehicletype": "primary_vehicle_type",
    "probablecause": "probable_cause",
    "weathercondition": "weather_condition",
    "injuredcount": "injuredcount",
    "fatalitycount": "fatalitycount",
    "vehiclesinvolved": "vehiclesinvolved",
}

def load_raw_accident_excel(
    excel_path: Optional[Path] = None,
    sheet_name: str = "Raw_AccidentLog"
) -> pd.DataFrame:
    """
    Load raw accident log Excel spreadsheet.
    """
    target_path = Path(excel_path) if excel_path else RAW_ACCIDENTS_EXCEL_PATH

    if not target_path.exists():
        raise FileNotFoundError(f"Raw accident Excel file not found at: {target_path}")

    df = pd.read_excel(target_path, sheet_name=sheet_name)
    return df

def clean_accident_dataframe(
    df: pd.DataFrame,
    data_source: str = "SIMULATED",
    is_simulated: bool = True
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Process raw accident DataFrame:
    1. Standardize column names.
    2. Attach data provenance fields (data_source, is_simulated).
    3. Convert dates and numeric fields.
    4. Remove duplicate accident IDs and invalid rows.
    5. Return cleaned DataFrame + audit report.
    """
    df = df.copy()

    # Drop completely empty rows
    df = df.dropna(how="all")

    # Column name normalization
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # Data Provenance Flags
    df["data_source"] = data_source
    df["is_simulated"] = is_simulated

    # Remove duplicates
    duplicate_count = 0
    if "accidentid" in df.columns:
        duplicate_count = int(df.duplicated(subset=["accidentid"]).sum())
        df = df.drop_duplicates(subset=["accidentid"]).copy()

    # Date parsing
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # String field cleaning
    text_cols = ["junction", "severity", "primaryvehicletype", "probablecause", "weathercondition"]
    for col in text_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip()

    # Numeric field conversion
    numeric_cols = ["injuredcount", "fatalitycount", "vehiclesinvolved"]
    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)
            # Replace negative counts with 0
            df.loc[df[col] < 0, col] = 0

    # Filter critical missing fields
    critical = [c for c in ["accidentid", "date", "junction"] if c in df.columns]
    df = df.dropna(subset=critical).copy()

    # Sort chronologically
    if "date" in df.columns:
        sort_cols = ["date"]
        if "time" in df.columns:
            sort_cols.append("time")
        df = df.sort_values(sort_cols).reset_index(drop=True)

    report = audit_accident_dataframe(df)
    report["duplicate_records"] = duplicate_count
    return df, report

def ingest_historical_accidents(
    excel_path: Optional[Path] = None,
    output_path: Optional[Path] = None,
    data_source: str = "SIMULATED",
    is_simulated: bool = True
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Full ingestion pipeline from Excel file to processed CSV output.
    """
    raw_df = load_raw_accident_excel(excel_path)
    clean_df, report = clean_accident_dataframe(
        raw_df,
        data_source=data_source,
        is_simulated=is_simulated
    )

    out_file = Path(output_path) if output_path else PROCESSED_ACCIDENTS_CLEAN_PATH
    out_file.parent.mkdir(parents=True, exist_ok=True)
    clean_df.to_csv(out_file, index=False)

    return clean_df, report
