"""
Canonical Target Variable Generator for Nagpur Pulse ML Service.
Constructs traffic_risk categorical labels (LOW, MEDIUM, HIGH, CRITICAL)
and continuous risk_score (0.0 to 100.0) without data leakage.
"""

from typing import Dict, Any, Tuple
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger("NagpurPulse.Target")


def compute_continuous_risk_score(df: pd.DataFrame) -> pd.Series:
    """
    Construct continuous numerical risk_score (0.0 to 100.0) from accident density,
    fatalities (weight=3.0), and injuries (weight=1.5).
    """
    df = df.copy()
    acc_count = df.get("total_accidents", pd.Series(0, index=df.index))
    fatal_count = df.get("total_fatalities", pd.Series(0, index=df.index))
    injury_count = df.get("total_injured", pd.Series(0, index=df.index))

    # Raw risk index
    raw_risk = (acc_count * 5.0) + (fatal_count * 15.0) + (injury_count * 7.5)
    
    # Scale smoothly to 0.0 - 100.0 range
    max_val = max(raw_risk.max(), 1.0)
    score = (raw_risk / max_val) * 100.0
    return score.round(2)


def assign_categorical_risk_level(score: float) -> str:
    """
    Map numerical risk score to 4-tier categorical risk level.
    - LOW: score < 25.0
    - MEDIUM: 25.0 <= score < 50.0
    - HIGH: 50.0 <= score < 75.0
    - CRITICAL: score >= 75.0
    """
    if score < 25.0:
        return "LOW"
    elif score < 50.0:
        return "MEDIUM"
    elif score < 75.0:
        return "HIGH"
    else:
        return "CRITICAL"


def add_target_variable(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Attach traffic_risk (categorical) and risk_score (continuous) to dataset.
    """
    df = df.copy()
    logger.info("Generating canonical traffic_risk target variable...")

    df["risk_score"] = compute_continuous_risk_score(df)
    df["traffic_risk"] = df["risk_score"].apply(assign_categorical_risk_level)

    # Calculate class distribution
    dist = df["traffic_risk"].value_counts().to_dict()
    target_summary = {
        "target_variable": "traffic_risk",
        "target_classes": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        "class_distribution": {str(k): int(v) for k, v in dist.items()},
        "numerical_risk_stats": {
            "min": float(df["risk_score"].min()),
            "max": float(df["risk_score"].max()),
            "mean": float(df["risk_score"].mean()),
        },
    }
    logger.info(f"Target variable generated successfully. Distribution: {dist}")
    return df, target_summary
