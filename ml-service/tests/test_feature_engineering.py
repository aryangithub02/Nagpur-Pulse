"""
Unit tests for windowed feature engineering and data leakage prevention.
"""

import pandas as pd
from app.pipeline.feature_engineering import calculate_junction_features

def test_calculate_junction_features_windowing():
    # Setup controlled accident logs
    eval_time = pd.Timestamp("2024-01-01 00:00:00")

    records = [
        {"junction": "Sitabuldi Chowk", "date": "2023-12-28", "severity": "Minor", "injuredcount": 1, "fatalitycount": 0}, # 4 days before -> inside 7d, 30d, 90d, 1y
        {"junction": "Sitabuldi Chowk", "date": "2023-12-15", "severity": "Fatal", "injuredcount": 0, "fatalitycount": 1}, # 17 days before -> inside 30d, 90d, 1y
        {"junction": "Sitabuldi Chowk", "date": "2023-11-01", "severity": "Minor", "injuredcount": 2, "fatalitycount": 0}, # 61 days before -> inside 90d, 1y
        {"junction": "Sitabuldi Chowk", "date": "2023-06-01", "severity": "Minor", "injuredcount": 1, "fatalitycount": 0}, # 214 days before -> inside 1y
        {"junction": "Sitabuldi Chowk", "date": "2022-01-01", "severity": "Minor", "injuredcount": 0, "fatalitycount": 0}, # > 1y -> excluded from 1y
    ]
    df = pd.DataFrame(records)

    features = calculate_junction_features(df, "Sitabuldi Chowk", prediction_time=eval_time)

    assert features["accidents_7d"] == 1.0
    assert features["accidents_30d"] == 2.0
    assert features["accidents_90d"] == 3.0
    assert features["accidents_1y"] == 4.0
    assert features["fatal_accidents_1y"] == 1.0
    assert features["injury_accidents_1y"] == 4.0 # 1 + 0 + 2 + 1
    assert features["historical_accident_rate"] == round(4.0 / 12.0, 4)

def test_data_leakage_prevention():
    """
    Test that future events (date >= eval_time) do NOT affect past feature calculations.
    """
    eval_time = pd.Timestamp("2024-01-01 00:00:00")

    records = [
        {"junction": "Sitabuldi Chowk", "date": "2023-12-28", "severity": "Minor", "injuredcount": 1, "fatalitycount": 0}, # Past
        {"junction": "Sitabuldi Chowk", "date": "2024-01-02", "severity": "Fatal", "injuredcount": 5, "fatalitycount": 3}, # FUTURE event!
        {"junction": "Sitabuldi Chowk", "date": "2024-02-10", "severity": "Fatal", "injuredcount": 10, "fatalitycount": 5}, # FUTURE event!
    ]
    df = pd.DataFrame(records)

    features = calculate_junction_features(df, "Sitabuldi Chowk", prediction_time=eval_time)

    # Future events MUST NOT be included
    assert features["accidents_7d"] == 1.0
    assert features["accidents_30d"] == 1.0
    assert features["accidents_1y"] == 1.0
    assert features["fatal_accidents_1y"] == 0.0
    assert features["injury_accidents_1y"] == 1.0
