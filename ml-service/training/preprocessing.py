"""
Preprocessing Pipelines & Leakage-Safe Target Encoder.
Ensures encodings are fitted strictly inside training splits/folds only.
"""

from typing import Dict, List, Optional
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

class SafeTargetEncoder(BaseEstimator, TransformerMixin):
    """
    Target Encoder fitted strictly on training data during fit().
    Never calculates target encoding over full dataset.
    """

    def __init__(self, col: str = "junction", target_col: str = "target", smoothing: float = 10.0):
        self.col = col
        self.target_col = target_col
        self.smoothing = smoothing
        self.global_mean_: float = 0.0
        self.encoding_map_: Dict[str, float] = {}

    def fit(self, X: pd.DataFrame, y: Optional[pd.Series] = None):
        df = X.copy()
        if y is not None:
            df["_target"] = y.values
        elif self.target_col in df.columns:
            df["_target"] = df[self.target_col]
        else:
            raise ValueError(f"Target column missing for SafeTargetEncoder.")

        self.global_mean_ = float(df["_target"].mean())
        stats = df.groupby(self.col)["_target"].agg(["count", "mean"])

        # Smoothed target encoding formula: (count * mean + smoothing * global_mean) / (count + smoothing)
        smooth_enc = (stats["count"] * stats["mean"] + self.smoothing * self.global_mean_) / (stats["count"] + self.smoothing)
        self.encoding_map_ = smooth_enc.to_dict()
        return self

    def transform(self, X: pd.DataFrame) -> pd.Series:
        df = X.copy()
        vals = df[self.col].astype(str).map(self.encoding_map_).fillna(self.global_mean_)
        return vals

class SafeFrequencyEncoder(BaseEstimator, TransformerMixin):
    """
    Frequency Encoder fitted strictly on training data.
    """

    def __init__(self, col: str = "junction"):
        self.col = col
        self.freq_map_: Dict[str, float] = {}
        self.default_freq_: float = 0.0

    def fit(self, X: pd.DataFrame, y=None):
        counts = X[self.col].value_counts(normalize=True)
        self.freq_map_ = counts.to_dict()
        self.default_freq_ = float(counts.min()) if not counts.empty else 0.0
        return self

    def transform(self, X: pd.DataFrame) -> pd.Series:
        return X[self.col].astype(str).map(self.freq_map_).fillna(self.default_freq_)
