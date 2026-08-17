"""
Standalone Executable Data Preprocessing Pipeline for Nagpur Pulse ML Service.
Executes Phase 1: Data Ingestion, Validation, Cleaning, Integration, Target Construction,
Leakage Removal, Chronological Splitting, and Artifact Export.
"""

import sys
import os
import json
from pathlib import Path
import pandas as pd
import numpy as np

# Ensure ml-service directory is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
ML_SERVICE_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = ML_SERVICE_DIR.parent

if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.pipeline.ingestion import ingest_all_raw_datasets
from app.pipeline.validators import audit_dataframe_quality
from app.pipeline.cleaning import clean_accidents_dataset
from app.pipeline.integration import build_junction_monthly_panel, get_live_tomtom_traffic_interface_schema
from app.pipeline.target import add_target_variable
from app.pipeline.leakage import remove_leakage_columns
from app.pipeline.splitting import chronological_train_val_test_split


def run_preprocessing_pipeline() -> Dict[str, Any]:
    """
    Run end-to-end Phase 1 preprocessing pipeline.
    """
    print("=" * 75)
    print("NAGPUR PULSE ML SERVICE - PHASE 1 DATA & PREPROCESSING PIPELINE")
    print("=" * 75)

    # 1. DATA INGESTION
    print("\n[1/7] Ingesting raw datasets...")
    raw_datasets = ingest_all_raw_datasets()
    accidents_raw_df = raw_datasets["accidents"]["data"]
    print(f"  - Ingested Raw Accidents: {len(accidents_raw_df)} records, {len(accidents_raw_df.columns)} columns")

    # 2. DATA VALIDATION
    print("\n[2/7] Auditing data quality...")
    raw_audit = audit_dataframe_quality(accidents_raw_df, dataset_name="raw_accidents")
    print(f"  - Raw Missing Values: {raw_audit['missing_value_counts']}")
    print(f"  - Raw Duplicates: {raw_audit['duplicate_rows_count']}")

    # 3. DATA CLEANING
    print("\n[3/7] Cleaning accident records...")
    accidents_clean_df, clean_audit = clean_accidents_dataset(accidents_raw_df)
    print(f"  - Clean Accidents Records: {len(accidents_clean_df)}")

    # 4. DATA INTEGRATION
    print("\n[4/7] Integrating junction-level monthly panel dataset...")
    panel_df = build_junction_monthly_panel(accidents_clean_df)
    print(f"  - Integrated Panel Records: {len(panel_df)} monthly junction observations")

    # 5. TARGET VARIABLE
    print("\n[5/7] Constructing traffic_risk target variable...")
    panel_with_target_df, target_summary = add_target_variable(panel_df)
    print(f"  - Target Distribution: {target_summary['class_distribution']}")

    # 6. DATA LEAKAGE PREVENTION
    print("\n[6/7] Removing data leakage columns...")
    clean_feature_df, leakage_summary = remove_leakage_columns(panel_with_target_df)
    print(f"  - Removed Leakage Columns: {leakage_summary['removed_columns']}")

    # 7. CHRONOLOGICAL SPLIT
    print("\n[7/7] Executing chronological train/val/test split...")
    train_df, val_df, test_df, split_info = chronological_train_val_test_split(clean_feature_df)
    print(f"  - Train Split: {len(train_df)} rows ({split_info['boundaries']['train_period']})")
    print(f"  - Val Split:   {len(val_df)} rows ({split_info['boundaries']['validation_period']})")
    print(f"  - Test Split:  {len(test_df)} rows ({split_info['boundaries']['test_period']})")

    # 8. EXPORT ARTIFACTS
    print("\n[EXPORT] Exporting ML-ready dataset artifacts and reports...")
    
    # Target directories
    processed_dir_1 = PROJECT_ROOT / "data" / "processed"
    reports_dir_1 = PROJECT_ROOT / "data" / "reports"

    processed_dir_2 = ML_SERVICE_DIR / "data" / "processed"
    reports_dir_2 = ML_SERVICE_DIR / "reports"

    for d in [processed_dir_1, reports_dir_1, processed_dir_2, reports_dir_2]:
        d.mkdir(parents=True, exist_ok=True)

    # Save Train / Val / Test CSVs
    for p_dir in [processed_dir_1, processed_dir_2]:
        train_df.to_csv(p_dir / "train.csv", index=False)
        val_df.to_csv(p_dir / "validation.csv", index=False)
        test_df.to_csv(p_dir / "test.csv", index=False)

    # Save Reports and Metadata JSONs
    feature_cols = [c for c in clean_feature_df.columns if c not in ["traffic_risk", "risk_score", "period_date"]]
    feature_schema = {c: str(clean_feature_df[c].dtype) for c in feature_cols}

    preprocessing_meta = {
        "pipeline_version": "1.0.0",
        "random_seed": 42,
        "raw_records_count": len(accidents_raw_df),
        "clean_records_count": len(clean_feature_df),
        "train_records_count": len(train_df),
        "validation_records_count": len(val_df),
        "test_records_count": len(test_df),
        "tomtom_live_interface": get_live_tomtom_traffic_interface_schema(),
    }

    full_reports = {
        "data_quality_report.json": raw_audit,
        "preprocessing_metadata.json": preprocessing_meta,
        "feature_schema.json": feature_schema,
        "target_definition.json": target_summary,
        "leakage_columns.json": leakage_summary,
        "split_info.json": split_info,
    }

    for r_dir in [reports_dir_1, reports_dir_2]:
        for fname, content in full_reports.items():
            with open(r_dir / fname, "w", encoding="utf-8") as f:
                json.dump(content, f, indent=2)

    print("\n" + "=" * 75)
    print("PHASE 1 PREPROCESSING COMPLETE - ALL ARTIFACTS EXPORTED SUCCESSFULLY")
    print("=" * 75)

    return preprocessing_meta


if __name__ == "__main__":
    run_preprocessing_pipeline()
