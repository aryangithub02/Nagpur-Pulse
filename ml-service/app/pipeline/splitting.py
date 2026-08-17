"""
Chronological Dataset Splitter for Nagpur Pulse ML Service.
Splits historical panel data temporally into Train (<2024), Validation (2024), and Test (2025).
"""

from typing import Tuple, Dict, Any
import pandas as pd
import logging

logger = logging.getLogger("NagpurPulse.Splitting")


def chronological_train_val_test_split(
    df: pd.DataFrame,
    date_col: str = "period_date"
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Split dataset chronologically to prevent future temporal leakage into training:
    - Train: period_date < 2024-01-01 (2020 - 2023)
    - Validation: 2024-01-01 <= period_date < 2025-01-01 (2024)
    - Test: period_date >= 2025-01-01 (2025)
    """
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df = df.sort_values(date_col).reset_index(drop=True)

    train_mask = df[date_col] < "2024-01-01"
    val_mask = (df[date_col] >= "2024-01-01") & (df[date_col] < "2025-01-01")
    test_mask = df[date_col] >= "2025-01-01"

    train_df = df[train_mask].copy().reset_index(drop=True)
    val_df = df[val_mask].copy().reset_index(drop=True)
    test_df = df[test_mask].copy().reset_index(drop=True)

    # Fallback if val_df is empty or train_df is missing: use 70/15/15 temporal quantile cutoffs
    if val_df.empty or len(train_df) < 12:
        logger.warning("Default year split boundaries empty/small. Applying 70/15/15 chronological quantile split.")
        unique_dates = df[date_col].sort_values().unique()
        t1 = unique_dates[int(len(unique_dates) * 0.70)]
        t2 = unique_dates[int(len(unique_dates) * 0.85)]

        train_df = df[df[date_col] < t1].copy().reset_index(drop=True)
        val_df = df[(df[date_col] >= t1) & (df[date_col] < t2)].copy().reset_index(drop=True)
        test_df = df[df[date_col] >= t2].copy().reset_index(drop=True)

    split_info = {
        "strategy": "Chronological Time-Series Split",
        "train_shape": list(train_df.shape),
        "validation_shape": list(val_df.shape),
        "test_shape": list(test_df.shape),
        "boundaries": {
            "train_period": f"{train_df[date_col].min().strftime('%Y-%m-%d')} to {train_df[date_col].max().strftime('%Y-%m-%d')}",
            "validation_period": f"{val_df[date_col].min().strftime('%Y-%m-%d')} to {val_df[date_col].max().strftime('%Y-%m-%d')}",
            "test_period": f"{test_df[date_col].min().strftime('%Y-%m-%d')} to {test_df[date_col].max().strftime('%Y-%m-%d')}",
        },
    }
    logger.info(f"Chronological split complete. Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
    return train_df, val_df, test_df, split_info
