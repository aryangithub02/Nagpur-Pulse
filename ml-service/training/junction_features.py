"""
Junction Temporal Feature Engineering.
Generates leakage-safe temporal features for junction x time-window evaluation.
"""

from typing import Any, Dict, Optional
import pandas as pd
import numpy as np

def compute_junction_temporal_features(
    accidents_df: pd.DataFrame,
    junction_name: str,
    prediction_time: pd.Timestamp
) -> Dict[str, Any]:
    """
    Compute comprehensive temporal feature vector for a junction at prediction timestamp T.
    Enforces strict timestamp boundary (event_date < prediction_time).
    """
    df = accidents_df.copy()
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"])

    norm_target = str(junction_name).strip().lower()
    df["norm_junction"] = df["junction"].astype(str).str.strip().str.lower()
    junction_df = df[df["norm_junction"] == norm_target].copy()

    # Strict Data Leakage Filter
    past_df = junction_df[junction_df["date"] < prediction_time].sort_values("date").copy()

    # Base Counts
    d7_cutoff = prediction_time - pd.Timedelta(days=7)
    d30_cutoff = prediction_time - pd.Timedelta(days=30)
    d90_cutoff = prediction_time - pd.Timedelta(days=90)
    d180_cutoff = prediction_time - pd.Timedelta(days=180)
    d365_cutoff = prediction_time - pd.Timedelta(days=365)

    df_7d = past_df[past_df["date"] >= d7_cutoff]
    df_30d = past_df[past_df["date"] >= d30_cutoff]
    df_90d = past_df[past_df["date"] >= d90_cutoff]
    df_180d = past_df[past_df["date"] >= d180_cutoff]
    df_1y = past_df[past_df["date"] >= d365_cutoff]

    accidents_7d = float(len(df_7d))
    accidents_30d = float(len(df_30d))
    accidents_90d = float(len(df_90d))
    accidents_180d = float(len(df_180d))
    accidents_1y = float(len(df_1y))

    # Fatal & Injury Counts
    fatal_30d = float(((df_30d["severity"].astype(str).str.lower() == "fatal") | (df_30d["fatalitycount"] > 0)).sum())
    fatal_90d = float(((df_90d["severity"].astype(str).str.lower() == "fatal") | (df_90d["fatalitycount"] > 0)).sum())
    fatal_1y = float(((df_1y["severity"].astype(str).str.lower() == "fatal") | (df_1y["fatalitycount"] > 0)).sum())

    injury_30d = float(df_30d["injuredcount"].sum())
    injury_90d = float(df_90d["injuredcount"].sum())
    injury_1y = float(df_1y["injuredcount"].sum())

    # Historical Accident Rate
    historical_accident_rate = round(accidents_1y / 12.0, 4)

    # Trend Features
    avg_monthly_hist = (accidents_1y / 12.0) + 1e-5
    recent_vs_historical_ratio = round(accidents_30d / avg_monthly_hist, 4)

    avg_monthly_90d = (accidents_90d / 3.0) + 1e-5
    trend_30d_vs_90d = round(accidents_30d / avg_monthly_90d, 4)

    avg_monthly_1y = (accidents_1y / 12.0) + 1e-5
    trend_90d_vs_1y = round((accidents_90d / 3.0) / avg_monthly_1y, 4)

    # Recency Features
    if not past_df.empty:
        last_date = past_df["date"].max()
        days_since_last_accident = float((prediction_time - last_date).days)

        fatal_df = past_df[(past_df["severity"].astype(str).str.lower() == "fatal") | (past_df["fatalitycount"] > 0)]
        if not fatal_df.empty:
            last_fatal_date = fatal_df["date"].max()
            days_since_last_fatal_accident = float((prediction_time - last_fatal_date).days)
        else:
            days_since_last_fatal_accident = 999.0
    else:
        days_since_last_accident = 999.0
        days_since_last_fatal_accident = 999.0

    return {
        "junction": junction_name,
        "accidents_7d": accidents_7d,
        "accidents_30d": accidents_30d,
        "accidents_90d": accidents_90d,
        "accidents_180d": accidents_180d,
        "accidents_1y": accidents_1y,
        "fatal_accidents_30d": fatal_30d,
        "fatal_accidents_90d": fatal_90d,
        "fatal_accidents_1y": fatal_1y,
        "injury_accidents_30d": injury_30d,
        "injury_accidents_90d": injury_90d,
        "injury_accidents_1y": injury_1y,
        "historical_accident_rate": historical_accident_rate,
        "recent_vs_historical_ratio": recent_vs_historical_ratio,
        "trend_30d_vs_90d": trend_30d_vs_90d,
        "trend_90d_vs_1y": trend_90d_vs_1y,
        "days_since_last_accident": days_since_last_accident,
        "days_since_last_fatal_accident": days_since_last_fatal_accident,
    }
