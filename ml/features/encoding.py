"""
Leakage-Free Categorical Encoder Engine.
Fits encoders ONLY on training data and transforms validation and test data consistently.
"""

from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np


class LeakageFreeCategoricalEncoder:
    """
    Fits categorical encodings (One-Hot & Target / Ordinal) ONLY on Training set.
    """

    def __init__(self, categorical_cols: Optional[List[str]] = None):
        self.categorical_cols = categorical_cols or ["zone", "priority_level", "junction"]
        self.one_hot_mappings: Dict[str, List[str]] = {}
        self.junction_risk_map: Dict[str, float] = {}
        self.junction_ordinal_map: Dict[str, int] = {}
        self.is_fitted = False

    def fit(self, train_df: pd.DataFrame, target_col: str = "risk_score") -> "LeakageFreeCategoricalEncoder":
        """
        Fit categorical encodings strictly on training set.
        """
        df = train_df.copy()

        # 1. One-Hot categories for low-cardinality fields (zone, priority_level)
        for col in ["zone", "priority_level"]:
            if col in df.columns:
                unique_vals = sorted([str(x).strip() for x in df[col].dropna().unique()])
                self.one_hot_mappings[col] = unique_vals

        # 2. Historical target encoding for high-cardinality junction column
        if "junction" in df.columns and target_col in df.columns:
            mean_risk = df.groupby("junction")[target_col].mean().to_dict()
            global_mean = float(df[target_col].mean())
            self.junction_risk_map = {str(k).strip(): float(v) for k, v in mean_risk.items()}
            self.junction_risk_map["_default_"] = global_mean

            # Ordinal map
            junctions = sorted([str(x).strip() for x in df["junction"].unique()])
            self.junction_ordinal_map = {j: i for i, j in enumerate(junctions)}
            self.junction_ordinal_map["_default_"] = -1

        self.is_fitted = True
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform dataset using encoders learned strictly from training data.
        """
        if not self.is_fitted:
            raise RuntimeError("Encoder must be fitted on training data before calling transform()")

        df = df.copy()

        # Apply One-Hot Encodings
        for col, categories in self.one_hot_mappings.items():
            if col in df.columns:
                for cat in categories:
                    dummy_name = f"{col}_{cat.lower().replace(' ', '_')}"
                    df[dummy_name] = (df[col].astype(str).str.strip() == cat).astype(int)

        # Apply Junction Historical Target & Ordinal Encodings
        if "junction" in df.columns:
            default_risk = self.junction_risk_map.get("_default_", 0.0)
            df["junction_target_enc"] = [
                self.junction_risk_map.get(str(j).strip(), default_risk)
                for j in df["junction"]
            ]

            default_ord = self.junction_ordinal_map.get("_default_", -1)
            df["junction_ordinal_enc"] = [
                self.junction_ordinal_map.get(str(j).strip(), default_ord)
                for j in df["junction"]
            ]

        return df
