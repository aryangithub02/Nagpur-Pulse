"""
Comprehensive Unit & Integration Test Suite for Phase 2 Feature Engineering Pipeline.
"""

import os
import sys
import json
from pathlib import Path
import pandas as pd
import numpy as np
import pytest

# Ensure project root is on sys.path
TEST_DIR = Path(__file__).resolve().parent
ML_SERVICE_DIR = TEST_DIR.parent
PROJECT_ROOT = ML_SERVICE_DIR.parent

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(ML_SERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(ML_SERVICE_DIR))

from ml.features.temporal import TemporalFeatureExtractor
from ml.features.traffic import TrafficFeatureExtractor
from ml.features.incidents import HistoricalIncidentFeatureExtractor
from ml.features.junction import JunctionFeatureExtractor, haversine_distance
from ml.features.weather import WeatherFeatureExtractor
from ml.features.spatial import SpatialFeatureExtractor
from ml.features.encoding import LeakageFreeCategoricalEncoder
from ml.features.validation import validate_feature_schema_consistency, audit_feature_leakage
from ml.features.pipeline import FeaturePipeline
from ml.features.build_feature_store import run_feature_engineering_pipeline


def test_temporal_and_cyclical_encoding():
    df = pd.DataFrame({
        "period_date": pd.date_range("2023-01-01", "2023-12-01", freq="MS")
    })
    extractor = TemporalFeatureExtractor()
    transformed = extractor.transform(df)

    assert "month_sin" in transformed.columns
    assert "month_cos" in transformed.columns
    assert "quarter" in transformed.columns

    # Verify sine/cosine range [-1.0, 1.0]
    assert (transformed["month_sin"] >= -1.0).all() and (transformed["month_sin"] <= 1.0).all()
    assert (transformed["month_cos"] >= -1.0).all() and (transformed["month_cos"] <= 1.0).all()


def test_traffic_ratio_calculations():
    df = pd.DataFrame({
        "traffic_volume": [500, 1200, 0],
        "road_capacity": [1000, 1000, 0],
        "average_speed": [40, 20, 0],
        "free_flow_speed": [50, 50, 50]
    })
    extractor = TrafficFeatureExtractor()
    transformed = extractor.transform(df)

    assert "volume_capacity_ratio" in transformed.columns
    assert "speed_ratio" in transformed.columns
    assert transformed["volume_capacity_ratio"].iloc[0] == 0.5
    assert transformed["speed_ratio"].iloc[0] == 0.8
    assert not np.isinf(transformed["volume_capacity_ratio"]).any()


def test_strict_lag_and_rolling_shift_leakage():
    # Verify shift(1) ensures current observation NEVER enters current rolling mean
    df = pd.DataFrame({
        "junction": ["LIC Chowk"] * 4,
        "period_date": pd.date_range("2023-01-01", "2023-04-01", freq="MS"),
        "accidents_7d": [10, 20, 30, 400] # Month 4 has huge spike 400
    })
    extractor = HistoricalIncidentFeatureExtractor()
    transformed = extractor.transform(df)

    assert "accidents_lag_1" in transformed.columns
    assert "accidents_rolling_mean_3" in transformed.columns

    # Row 0: no prior history -> lag_1 = 0
    assert transformed["accidents_lag_1"].iloc[0] == 0.0

    # Row 3 (Month 4): lag_1 MUST be 30 (Month 3), NOT 400 (Month 4)
    assert transformed["accidents_lag_1"].iloc[3] == 30.0

    # Row 3 (Month 4): 3-month rolling mean of prior months (10, 20, 30) = 20.0
    assert transformed["accidents_rolling_mean_3"].iloc[3] == 20.0


def test_haversine_spatial_distance():
    # Zero Mile coordinates (21.1458, 79.0882) -> distance to self must be 0.0 km
    dist_self = haversine_distance(21.1458, 79.0882)
    assert dist_self == 0.0

    # Distance to LIC Chowk (~0.8 km)
    dist_lic = haversine_distance(21.1520, 79.0880)
    assert 0.5 < dist_lic < 2.0


def test_leakage_free_encoder():
    train_df = pd.DataFrame({
        "junction": ["LIC Chowk", "Sitabuldi Interchange"],
        "zone": ["Central Zone", "South Zone"],
        "risk_score": [80.0, 20.0]
    })
    val_df = pd.DataFrame({
        "junction": ["LIC Chowk", "Unknown New Junction"],
        "zone": ["Central Zone", "North Zone"],
        "risk_score": [95.0, 10.0] # Val target must not affect fitted encodings
    })

    encoder = LeakageFreeCategoricalEncoder()
    encoder.fit(train_df, target_col="risk_score")

    val_transformed = encoder.transform(val_df)
    assert "junction_target_enc" in val_transformed.columns
    assert "zone_central_zone" in val_transformed.columns

    # LIC Chowk target encoding in Val MUST equal train mean (80.0), unaffected by Val target (95.0)
    assert val_transformed["junction_target_enc"].iloc[0] == 80.0


def test_pipeline_fit_transform_schema_consistency():
    train_df = pd.read_csv(PROJECT_ROOT / "data" / "processed" / "train.csv")
    val_df = pd.read_csv(PROJECT_ROOT / "data" / "processed" / "validation.csv")
    test_df = pd.read_csv(PROJECT_ROOT / "data" / "processed" / "test.csv")

    pipeline = FeaturePipeline()
    train_feat = pipeline.fit_transform(train_df)
    val_feat = pipeline.transform(val_df)
    test_feat = pipeline.transform(test_df)

    is_valid, errors = validate_feature_schema_consistency(train_feat, val_feat, test_feat)
    assert is_valid is True
    assert len(errors) == 0
    assert list(train_feat.columns) == list(val_feat.columns) == list(test_feat.columns)


def test_feature_store_build_pipeline():
    report = run_feature_engineering_pipeline()
    assert report["schema_consistency_passed"] is True
    assert len(report["data_leakage_detected"]) == 0
    assert len(report["top_15_candidate_features"]) == 15
