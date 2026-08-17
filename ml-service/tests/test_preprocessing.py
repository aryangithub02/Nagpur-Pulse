"""
Comprehensive Unit & Integration Test Suite for Phase 1 Data & Preprocessing Pipeline.
"""

import os
import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np
import pytest

# Ensure ml-service directory is on sys.path
TEST_DIR = Path(__file__).resolve().parent
ML_SERVICE_DIR = TEST_DIR.parent
PROJECT_ROOT = ML_SERVICE_DIR.parent

if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.pipeline.ingestion import load_accidents_excel, ingest_all_raw_datasets
from app.pipeline.validators import validate_coordinates, audit_dataframe_quality
from app.pipeline.cleaning import clean_and_normalize_columns, remove_duplicate_records, cap_outliers_iqr, clean_accidents_dataset
from app.pipeline.integration import build_junction_monthly_panel, get_live_tomtom_traffic_interface_schema
from app.pipeline.target import add_target_variable, assign_categorical_risk_level
from app.pipeline.leakage import remove_leakage_columns, LEAKAGE_COLUMN_BLACKLIST
from app.pipeline.splitting import chronological_train_val_test_split
from data.preprocess import run_preprocessing_pipeline


def test_duplicate_removal():
    df = pd.DataFrame({
        "accidentid": [1, 2, 2, 3],
        "date": ["2023-01-01", "2023-01-02", "2023-01-02", "2023-01-03"],
        "junction": ["LIC Chowk", "Sitabuldi", "Sitabuldi", "Variety Square"]
    })
    clean_df, removed = remove_duplicate_records(df, subset_cols=["accidentid"])
    assert len(clean_df) == 3
    assert removed == 1
    assert list(clean_df["accidentid"]) == [1, 2, 3]


def test_missing_value_handling_and_column_normalization():
    df = pd.DataFrame({
        "Accident ID": [101, 102],
        "Date": ["2023-05-10", "2023-05-11"],
        "Junction": ["  LIC Chowk  ", None],
        "Injured Count": [-2, np.nan]
    })
    cleaned_df, _ = clean_accidents_dataset(df)
    assert any(c in cleaned_df.columns for c in ["accident_id", "accidentid"])
    assert "injuredcount" in cleaned_df.columns or "injured_count" in cleaned_df.columns
    assert (cleaned_df.get("injuredcount", cleaned_df.get("injured_count")) >= 0).all()
    assert cleaned_df["junction"].iloc[0] == "LIC CHOWK"


def test_invalid_coordinate_detection():
    assert validate_coordinates(21.1458, 79.0882) is True
    assert validate_coordinates(0.0, 0.0) is False
    assert validate_coordinates(99.0, 180.0) is False
    assert validate_coordinates(None, 79.0882) is False


def test_outlier_handling_without_deletion():
    df = pd.DataFrame({
        "accidents_7d": [1, 2, 1, 3, 2, 1, 1000] # Extreme outlier
    })
    capped_df, capped_cnt = cap_outliers_iqr(df, numeric_cols=["accidents_7d"], factor=3.0)
    assert len(capped_df) == 7 # Row count preserved!
    assert capped_cnt == 1
    assert capped_df["accidents_7d"].max() < 1000


def test_target_generation():
    assert assign_categorical_risk_level(10.0) == "LOW"
    assert assign_categorical_risk_level(30.0) == "MEDIUM"
    assert assign_categorical_risk_level(60.0) == "HIGH"
    assert assign_categorical_risk_level(85.0) == "CRITICAL"

    df = pd.DataFrame({
        "total_accidents": [0, 5, 20],
        "total_fatalities": [0, 1, 5],
        "total_injured": [0, 2, 10]
    })
    target_df, summary = add_target_variable(df)
    assert "traffic_risk" in target_df.columns
    assert "risk_score" in target_df.columns
    assert summary["target_variable"] == "traffic_risk"
    assert set(target_df["traffic_risk"].unique()).issubset({"LOW", "MEDIUM", "HIGH", "CRITICAL"})


test_leakage_cases = [
    ("PoliceCaseRegistered", "policecaseregistered"),
    ("FatalityCount", "fatalitycount"),
    ("InjuredCount", "injuredcount"),
    ("VehiclesInvolved", "vehiclesinvolved"),
]

def test_leakage_removal():
    df = pd.DataFrame({
        "junction": ["LIC Chowk"],
        "accidents_7d": [3],
        "PoliceCaseRegistered": ["YES"],
        "FatalityCount": [2],
        "total_fatalities": [2]
    })
    clean_df, meta = remove_leakage_columns(df)
    assert "PoliceCaseRegistered" not in clean_df.columns
    assert "FatalityCount" not in clean_df.columns
    assert "total_fatalities" not in clean_df.columns
    assert "junction" in clean_df.columns
    assert "accidents_7d" in clean_df.columns
    assert meta["removed_columns_count"] == 3


def test_chronological_splitting():
    dates = pd.date_range("2020-01-01", "2025-12-01", freq="MS")
    df = pd.DataFrame({
        "period_date": dates,
        "val": range(len(dates))
    })
    train, val, test, split_info = chronological_train_val_test_split(df)
    assert train["period_date"].max() < val["period_date"].min()
    assert val["period_date"].max() < test["period_date"].min()
    assert train["period_date"].max() < pd.Timestamp("2024-01-01")
    assert val["period_date"].max() < pd.Timestamp("2025-01-01")


def test_pipeline_reproducibility():
    meta1 = run_preprocessing_pipeline()
    meta2 = run_preprocessing_pipeline()
    assert meta1["raw_records_count"] == meta2["raw_records_count"]
    assert meta1["clean_records_count"] == meta2["clean_records_count"]
    assert meta1["train_records_count"] == meta2["train_records_count"]
    assert meta1["test_records_count"] == meta2["test_records_count"]
