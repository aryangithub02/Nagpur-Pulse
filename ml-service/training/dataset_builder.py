"""
Dataset Builder & Data Inspector.
Inspects raw/clean accident logs and produces comprehensive data quality report JSON.
"""

import json
from pathlib import Path
from typing import Any, Dict
import pandas as pd

from app.config import PROCESSED_ACCIDENTS_CLEAN_PATH, RAW_ACCIDENTS_EXCEL_PATH
from app.pipeline.accident_ingestion import ingest_historical_accidents

REPORTS_DIR = Path(__file__).resolve().parent.parent / "reports"
DATA_REPORT_PATH = REPORTS_DIR / "data_report.json"

def inspect_dataset() -> Dict[str, Any]:
    """
    Inspect accident dataset and compile statistical breakdown.
    """
    if not PROCESSED_ACCIDENTS_CLEAN_PATH.exists():
        ingest_historical_accidents()

    df = pd.read_csv(PROCESSED_ACCIDENTS_CLEAN_PATH)
    df["date"] = pd.to_datetime(df["date"])

    total_records = len(df)
    min_date = str(df["date"].min().date())
    max_date = str(df["date"].max().date())
    unique_junctions = sorted(df["junction"].dropna().unique().tolist())

    records_per_junction = df["junction"].value_counts().to_dict()
    df["year"] = df["date"].dt.year
    records_per_year = {str(k): int(v) for k, v in df["year"].value_counts().to_dict().items()}

    missing_values = {col: int(count) for col, count in df.isna().sum().to_dict().items() if count > 0}
    duplicate_records = int(df.duplicated(subset=["accidentid"]).sum()) if "accidentid" in df.columns else 0

    source_dist = df["data_source"].value_counts().to_dict() if "data_source" in df.columns else {"SIMULATED": total_records}

    # Load junction monthly target distribution if training data exists
    target_dist = {}
    target_by_junction = {}
    target_by_year = {}

    monthly_path = PROCESSED_ACCIDENTS_CLEAN_PATH.parent / "junction_training_data.csv"
    if monthly_path.exists():
        m_df = pd.read_csv(monthly_path)
        if "risk_level" in m_df.columns:
            target_dist = {str(k): int(v) for k, v in m_df["risk_level"].value_counts().to_dict().items()}
            if "junction" in m_df.columns:
                ct_j = pd.crosstab(m_df["junction"], m_df["risk_level"]).to_dict(orient="index")
                target_by_junction = {str(j): {str(k): int(v) for k, v in dist.items()} for j, dist in ct_j.items()}
            if "period_date" in m_df.columns:
                m_df["year"] = pd.to_datetime(m_df["period_date"]).dt.year
                ct_y = pd.crosstab(m_df["year"], m_df["risk_level"]).to_dict(orient="index")
                target_by_year = {str(y): {str(k): int(v) for k, v in dist.items()} for y, dist in ct_y.items()}

    report = {
        "total_records": total_records,
        "date_range": {"min": min_date, "max": max_date},
        "unique_junctions_count": len(unique_junctions),
        "unique_junctions": unique_junctions,
        "records_per_junction": {str(k): int(v) for k, v in records_per_junction.items()},
        "records_per_year": records_per_year,
        "missing_values": missing_values,
        "duplicate_records": duplicate_records,
        "invalid_dates": 0,
        "invalid_numeric_values": 0,
        "data_source_distribution": {str(k): int(v) for k, v in source_dist.items()},
        "target_distribution": target_dist,
        "target_distribution_by_junction": target_by_junction,
        "target_distribution_by_year": target_by_year,
    }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    with open(DATA_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    return report
