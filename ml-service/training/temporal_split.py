"""
Temporal Dataset Splitter.
Splits junction monthly dataset into Train (<2024), Validation (2024), and Test (2025) partitions.
Supports rolling temporal cross-validation folds.
"""

from typing import List, Tuple, Dict, Any
import pandas as pd

def temporal_train_val_test_split(
    df: pd.DataFrame,
    date_col: str = "period_date"
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Split dataset temporally:
    - Train: year < 2024 (2020-2023)
    - Validation: year == 2024
    - Test: year == 2025
    """
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    years = df[date_col].dt.year

    train_df = df[years < 2024].copy()
    val_df = df[years == 2024].copy()
    test_df = df[years == 2025].copy()

    # Fallback if 2024 is empty or small: use 80% train, 10% val, 10% test temporal cutoffs
    if val_df.empty or len(train_df) < 50:
        sorted_dates = df[date_col].sort_values().unique()
        t_cutoff_val = sorted_dates[int(len(sorted_dates) * 0.7)]
        t_cutoff_test = sorted_dates[int(len(sorted_dates) * 0.85)]

        train_df = df[df[date_col] < t_cutoff_val].copy()
        val_df = df[(df[date_col] >= t_cutoff_val) & (df[date_col] < t_cutoff_test)].copy()
        test_df = df[df[date_col] >= t_cutoff_test].copy()

    return train_df, val_df, test_df

def generate_rolling_temporal_folds(
    df: pd.DataFrame,
    date_col: str = "period_date",
    n_folds: int = 3
) -> List[Tuple[pd.DataFrame, pd.DataFrame]]:
    """
    Generate rolling temporal CV folds:
    Fold 1: train early -> validate next period
    Fold 2: expanded train -> validate next period
    No future data enters earlier folds.
    """
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df = df.sort_values(date_col).reset_index(drop=True)

    unique_dates = df[date_col].unique()
    total_dates = len(unique_dates)

    folds = []
    min_train_len = int(total_dates * 0.5)
    val_len = int(total_dates * 0.15)

    for i in range(n_folds):
        train_end_idx = min_train_len + (i * val_len)
        val_end_idx = min(train_end_idx + val_len, total_dates)

        if train_end_idx >= total_dates or train_end_idx >= val_end_idx:
            break

        train_dates = unique_dates[:train_end_idx]
        val_dates = unique_dates[train_end_idx:val_end_idx]

        train_fold = df[df[date_col].isin(train_dates)].copy()
        val_fold = df[df[date_col].isin(val_dates)].copy()

        if not train_fold.empty and not val_fold.empty:
            folds.append((train_fold, val_fold))

    return folds
