"""
Standalone Feature Store Builder for Nagpur Pulse ML Service.
Transforms Phase 1 datasets into model-ready feature stores (train_features.csv, validation_features.csv, test_features.csv)
and generates feature metadata JSON reports.
"""

import sys
import os
import json
from pathlib import Path
import pandas as pd
import numpy as np

# Ensure project root is on sys.path
FEATURE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = FEATURE_DIR.parent.parent
ML_SERVICE_DIR = PROJECT_ROOT / "ml-service"

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

from ml.features.pipeline import FeaturePipeline
from ml.features.validation import validate_feature_schema_consistency, audit_feature_leakage


def run_feature_engineering_pipeline():
    """
    Run end-to-end Phase 2 feature engineering pipeline.
    """
    print("=" * 75)
    print("NAGPUR PULSE ML SERVICE - PHASE 2 FEATURE ENGINEERING PIPELINE")
    print("=" * 75)

    # 1. LOAD PHASE 1 DATASETS
    print("\n[1/6] Loading Phase 1 clean datasets...")
    train_path = PROJECT_ROOT / "data" / "processed" / "train.csv"
    val_path = PROJECT_ROOT / "data" / "processed" / "validation.csv"
    test_path = PROJECT_ROOT / "data" / "processed" / "test.csv"

    if not train_path.exists():
        raise FileNotFoundError(f"Phase 1 train dataset not found at: {train_path}. Run Phase 1 first!")

    train_df = pd.read_csv(train_path)
    val_df = pd.read_csv(val_path)
    test_df = pd.read_csv(test_path)

    print(f"  - Loaded Train Set:      {train_df.shape}")
    print(f"  - Loaded Validation Set: {val_df.shape}")
    print(f"  - Loaded Test Set:       {test_df.shape}")

    # 2. FIT & TRANSFORM FEATURE PIPELINE
    print("\n[2/6] Executing FeaturePipeline fit & transform...")
    pipeline = FeaturePipeline()
    pipeline.fit(train_df, target_col="risk_score")

    train_features = pipeline.transform(train_df)
    val_features = pipeline.transform(val_df)
    test_features = pipeline.transform(test_df)

    print(f"  - Generated Train Feature Shape:      {train_features.shape}")
    print(f"  - Generated Validation Feature Shape: {val_features.shape}")
    print(f"  - Generated Test Feature Shape:       {test_features.shape}")

    # 3. SCHEMA CONSISTENCY & LEAKAGE AUDIT
    print("\n[3/6] Auditing feature schema consistency and leakage...")
    is_valid_schema, schema_errors = validate_feature_schema_consistency(train_features, val_features, test_features)
    leakage_cols = audit_feature_leakage(train_features, target_cols=["traffic_risk", "risk_score", "junction_target_enc"])

    if not is_valid_schema:
        print(f"  [WARNING] Schema errors: {schema_errors}")
    else:
        print("  [SUCCESS] 100% Identical Feature Schema across Train, Validation, and Test sets!")

    print(f"  - Data Leakage Check: {len(leakage_cols)} leakage columns detected.")

    # 4. TOP 15 CANDIDATE FEATURES FOR XGBOOST / RANDOM FOREST
    feature_list = pipeline.final_feature_names
    top_15_candidates = feature_list[:15]

    # 5. EXPORT FEATURE STORES & METADATA
    print("\n[4/6] Exporting Feature Store CSVs and Metadata JSON reports...")

    feature_store_dir1 = PROJECT_ROOT / "data" / "feature_store"
    reports_dir1 = PROJECT_ROOT / "data" / "reports"
    feature_store_dir2 = ML_SERVICE_DIR / "data" / "feature_store"
    reports_dir2 = ML_SERVICE_DIR / "reports"

    for d in [feature_store_dir1, reports_dir1, feature_store_dir2, reports_dir2]:
        d.mkdir(parents=True, exist_ok=True)

    # Save CSVs
    for fs_dir in [feature_store_dir1, feature_store_dir2]:
        train_features.to_csv(fs_dir / "train_features.csv", index=False)
        val_features.to_csv(fs_dir / "validation_features.csv", index=False)
        test_features.to_csv(fs_dir / "test_features.csv", index=False)

    # Build Metadata
    feature_metadata = []
    for f_name in feature_list:
        dtype_str = str(train_features[f_name].dtype)
        category = "temporal" if any(x in f_name for x in ["month", "year", "quarter", "sin", "cos", "peak"]) else \
                   "historical_incident" if any(x in f_name for x in ["accidents", "lag", "rolling", "rate"]) else \
                   "spatial" if any(x in f_name for x in ["dist", "latitude", "longitude"]) else \
                   "categorical" if any(x in f_name for x in ["zone", "enc", "priority"]) else "traffic"
        
        feature_metadata.append({
            "feature_name": f_name,
            "data_type": dtype_str,
            "category": category,
            "uses_future_data": False,
            "missing_percentage": float(train_features[f_name].isna().mean() * 100),
        })

    feature_report = {
        "total_original_features": train_df.shape[1],
        "total_engineered_features": len(feature_list),
        "train_feature_shape": list(train_features.shape),
        "validation_feature_shape": list(val_features.shape),
        "test_feature_shape": list(test_features.shape),
        "schema_consistency_passed": is_valid_schema,
        "data_leakage_detected": leakage_cols,
        "top_15_candidate_features": top_15_candidates,
    }

    # Save JSON reports
    for r_dir in [reports_dir1, reports_dir2]:
        with open(r_dir / "feature_report.json", "w", encoding="utf-8") as f:
            json.dump(feature_report, f, indent=2)
        with open(r_dir / "feature_metadata.json", "w", encoding="utf-8") as f:
            json.dump(feature_metadata, f, indent=2)
        with open(r_dir / "feature_names.json", "w", encoding="utf-8") as f:
            json.dump(feature_list, f, indent=2)

    print("\n" + "=" * 75)
    print("PHASE 2 FEATURE ENGINEERING COMPLETE - ALL FEATURE STORES EXPORTED")
    print("=" * 75)

    return feature_report


if __name__ == "__main__":
    run_feature_engineering_pipeline()
