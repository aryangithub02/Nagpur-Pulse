"""
Feature Engineering Pipeline.
Calculates windowed historical features (7d, 30d, 90d, 1y) for a junction given prediction timestamp T.
Strictly prevents future-data leakage.
"""

from typing import Any, Dict, Optional
import pandas as pd
import numpy as np

def calculate_junction_features(
    accidents_df: pd.DataFrame,
    junction_name: str,
    prediction_time: Optional[pd.Timestamp] = None
) -> Dict[str, Any]:
    """
    Calculate 7-day, 30-day, 90-day, 1-year historical accident counts,
    fatal/injury totals, and historical accident rate for a junction.

    Enforces data leakage boundary: only records with date < prediction_time (or <= prediction_time)
    are included.
    """
    if prediction_time is None:
        eval_time = pd.Timestamp.now()
    else:
        eval_time = pd.to_datetime(prediction_time)

    # 1. Filter by junction name (case insensitive match)
    df = accidents_df.copy()
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"])

    norm_target = str(junction_name).strip().lower()
    df["norm_junction"] = df["junction"].astype(str).str.strip().str.lower()
    junction_df = df[df["norm_junction"] == norm_target].copy()

    # 2. Strict Data Leakage Prevention: Exclude future events (date >= eval_time if timestamp has time, or date > eval_time)
    past_df = junction_df[junction_df["date"] < eval_time].copy()

    if past_df.empty:
        return {
            "accidents_7d": 0.0,
            "accidents_30d": 0.0,
            "accidents_90d": 0.0,
            "accidents_1y": 0.0,
            "fatal_accidents_1y": 0.0,
            "injury_accidents_1y": 0.0,
            "historical_accident_rate": 0.0,
            "junction": junction_name
        }

    # Window definitions relative to eval_time
    d7_cutoff = eval_time - pd.Timedelta(days=7)
    d30_cutoff = eval_time - pd.Timedelta(days=30)
    d90_cutoff = eval_time - pd.Timedelta(days=90)
    d365_cutoff = eval_time - pd.Timedelta(days=365)

    df_7d = past_df[past_df["date"] >= d7_cutoff]
    df_30d = past_df[past_df["date"] >= d30_cutoff]
    df_90d = past_df[past_df["date"] >= d90_cutoff]
    df_1y = past_df[past_df["date"] >= d365_cutoff]

    accidents_7d = float(len(df_7d))
    accidents_30d = float(len(df_30d))
    accidents_90d = float(len(df_90d))
    accidents_1y = float(len(df_1y))

    # Fatal accidents count in 1 year
    fatal_mask = (df_1y["severity"].astype(str).str.lower() == "fatal") | (df_1y["fatalitycount"] > 0)
    fatal_accidents_1y = float(fatal_mask.sum())

    # Injury count sum in 1 year
    injury_accidents_1y = float(df_1y["injuredcount"].sum())

    # Historical accident rate: accidents_1y / 12
    historical_accident_rate = round(accidents_1y / 12.0, 4)

    return {
        "accidents_7d": accidents_7d,
        "accidents_30d": accidents_30d,
        "accidents_90d": accidents_90d,
        "accidents_1y": accidents_1y,
        "fatal_accidents_1y": fatal_accidents_1y,
        "injury_accidents_1y": injury_accidents_1y,
        "historical_accident_rate": historical_accident_rate,
        "junction": junction_name
    }
