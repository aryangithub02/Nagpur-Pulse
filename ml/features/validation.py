"""
Feature Schema & Data Leakage Audit Engine.
Validates zero-variance features, schema consistency across splits, and leakage checks.
"""

from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger("NagpurPulse.FeatureValidation")

LEAKAGE_TARGET_PATTERNS = ["future", "target", "post_event"]


def audit_feature_leakage(df: pd.DataFrame, target_cols: List[str]) -> List[str]:
    """
    Check for potential target leakage columns in features DataFrame.
    """
    leakage_found = []
    for col in df.columns:
        if col in target_cols:
            continue
        clean_col = col.lower()
        for pattern in LEAKAGE_TARGET_PATTERNS:
            if pattern in clean_col:
                leakage_found.append(col)
                break
    return leakage_found


def validate_feature_schema_consistency(
    train_df: pd.DataFrame, val_df: pd.DataFrame, test_df: pd.DataFrame
) -> Tuple[bool, List[str]]:
    """
    Verify identical feature schemas, column ordering, and data types across splits.
    """
    errors = []
    if list(train_df.columns) != list(val_df.columns):
        errors.append("Mismatch in feature columns between Train and Validation splits.")
    if list(train_df.columns) != list(test_df.columns):
        errors.append("Mismatch in feature columns between Train and Test splits.")

    for col in train_df.columns:
        if train_df[col].dtype != val_df[col].dtype:
            errors.append(f"Dtype mismatch for '{col}': Train ({train_df[col].dtype}) vs Val ({val_df[col].dtype})")
        if train_df[col].dtype != test_df[col].dtype:
            errors.append(f"Dtype mismatch for '{col}': Train ({train_df[col].dtype}) vs Test ({test_df[col].dtype})")

    return len(errors) == 0, errors


def drop_constant_and_duplicate_features(train_df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """
    Identify and drop constant features (zero variance) from training DataFrame.
    """
    df = train_df.copy()
    dropped_cols = []

    for col in df.select_dtypes(include=[np.number]).columns:
        if df[col].std() == 0 or df[col].nunique() <= 1:
            dropped_cols.append(col)

    if dropped_cols:
        df = df.drop(columns=dropped_cols)
        logger.info(f"Dropped {len(dropped_cols)} constant zero-variance features: {dropped_cols}")

    return df, dropped_cols
