"""
Class Imbalance Mitigation Module.
Computes class weights, sample weights, and training-only oversampling.
Never applies oversampling to validation or test sets.
"""

from typing import Dict, Tuple, Any
import numpy as np
import pandas as pd
from sklearn.utils.class_weight import compute_class_weight

def compute_sample_weights(y_train: np.ndarray) -> np.ndarray:
    """
    Compute per-sample weight vector for training data based on inverse class frequency.
    """
    classes = np.unique(y_train)
    weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
    weight_map = dict(zip(classes, weights))
    sample_weights = np.array([weight_map[val] for val in y_train])
    return sample_weights

def compute_class_weight_dict(y_train: np.ndarray) -> Dict[int, float]:
    """
    Compute class weight dictionary mapping class_id -> weight.
    """
    classes = np.unique(y_train)
    weights = compute_class_weight(class_weight="balanced", classes=classes, y=y_train)
    return {int(cls): float(w) for cls, w in zip(classes, weights)}

def oversample_training_split(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.Series]:
    """
    Perform controlled random oversampling on TRAIN split ONLY.
    """
    df = X_train.copy()
    df["_target"] = y_train.values

    max_count = df["_target"].value_counts().max()
    resampled_groups = []

    for cls, group in df.groupby("_target"):
        if len(group) < max_count:
            resampled = group.sample(n=max_count, replace=True, random_state=random_state)
        else:
            resampled = group
        resampled_groups.append(resampled)

    balanced_df = pd.concat(resampled_groups, ignore_index=True)
    balanced_df = balanced_df.sample(frac=1.0, random_state=random_state).reset_index(drop=True)

    y_balanced = balanced_df["_target"].copy()
    X_balanced = balanced_df.drop(columns=["_target"])

    return X_balanced, y_balanced
