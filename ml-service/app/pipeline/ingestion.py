"""
Unified Data Ingestion Layer for Nagpur Pulse ML Service.
Preserves original raw data while standardizing multi-format inputs (Excel, CSV, JSON).
"""

import json
from pathlib import Path
from typing import Dict, Any, List, Tuple, Optional
import pandas as pd
import numpy as np

# Path definitions
RAW_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data" / "raw"


def load_accidents_excel(
    excel_path: Optional[Path] = None,
    sheet_name: str = "Raw_AccidentLog"
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Load raw historical accident log spreadsheet.
    """
    target_path = Path(excel_path) if excel_path else RAW_DATA_DIR / "nagpur_accidents_2020_2025.xlsx"
    if not target_path.exists():
        raise FileNotFoundError(f"Accident dataset not found at: {target_path}")

    df = pd.read_excel(target_path, sheet_name=sheet_name)
    schema = {col: str(df[col].dtype) for col in df.columns}
    
    metadata = {
        "file_name": target_path.name,
        "format": "Excel",
        "sheet_name": sheet_name,
        "raw_rows": len(df),
        "raw_cols": len(df.columns),
        "columns": list(df.columns),
        "schema": schema,
    }
    return df, metadata


def load_csv_dataset(csv_path: Path) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Load raw CSV dataset with metadata extraction.
    """
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV file not found at: {csv_path}")

    df = pd.read_csv(csv_path)
    schema = {col: str(df[col].dtype) for col in df.columns}

    metadata = {
        "file_name": csv_path.name,
        "format": "CSV",
        "raw_rows": len(df),
        "raw_cols": len(df.columns),
        "columns": list(df.columns),
        "schema": schema,
    }
    return df, metadata


def load_json_dataset(json_path: Path) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Load raw JSON dataset with metadata extraction.
    """
    if not json_path.exists():
        raise FileNotFoundError(f"JSON file not found at: {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    count = len(data) if isinstance(data, list) else len(data.keys()) if isinstance(data, dict) else 1
    metadata = {
        "file_name": json_path.name,
        "format": "JSON",
        "raw_elements": count,
    }
    return data, metadata


def ingest_all_raw_datasets(raw_dir: Optional[Path] = None) -> Dict[str, Any]:
    """
    Ingest all available raw datasets from data/raw/ without altering source files.
    """
    target_dir = Path(raw_dir) if raw_dir else RAW_DATA_DIR
    results = {}

    # 1. Ingest Accidents Excel
    excel_path = target_dir / "nagpur_accidents_2020_2025.xlsx"
    if excel_path.exists():
        acc_df, acc_meta = load_accidents_excel(excel_path)
        results["accidents"] = {"data": acc_df, "metadata": acc_meta}

    # 2. Ingest Traffic Violations
    viol_csv = target_dir / "traffic_violations.csv"
    if viol_csv.exists():
        v_df, v_meta = load_csv_dataset(viol_csv)
        results["violations"] = {"data": v_df, "metadata": v_meta}

    # 3. Ingest Illegal Parking
    park_csv = target_dir / "illegal_parking.csv"
    if park_csv.exists():
        p_df, p_meta = load_csv_dataset(park_csv)
        results["parking"] = {"data": p_df, "metadata": p_meta}

    # 4. Ingest Junction Meta JSON
    j_json = target_dir / "nagpur_second_20_junctions (1).json"
    if j_json.exists():
        j_data, j_meta = load_json_dataset(j_json)
        results["junctions"] = {"data": j_data, "metadata": j_meta}

    # 5. Ingest Police Fleet CSV
    police_csv = target_dir / "police_units_final (2).csv"
    if police_csv.exists():
        pol_df, pol_meta = load_csv_dataset(police_csv)
        results["police_units"] = {"data": pol_df, "metadata": pol_meta}

    return results
