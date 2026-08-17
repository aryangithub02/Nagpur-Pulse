"""
Historical Incident & Lag Feature Engineering Module.
Computes junction-level lag and rolling window features strictly using prior observations (.shift(1)).
"""

import pandas as pd
import numpy as np


class HistoricalIncidentFeatureExtractor:
    """
    Derives junction-level historical lag and rolling statistics without forward data leakage.
    """

    def __init__(self, junction_col: str = "junction", date_col: str = "period_date"):
        self.junction_col = junction_col
        self.date_col = date_col

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Apply strict groupby -> shift(1) -> rolling aggregations.
        """
        df = df.copy()

        if self.junction_col not in df.columns or self.date_col not in df.columns:
            return df

        # Ensure chronological ordering per junction
        df[self.date_col] = pd.to_datetime(df[self.date_col])
        df = df.sort_values([self.junction_col, self.date_col]).reset_index(drop=True)

        target_base = "accidents_7d" if "accidents_7d" in df.columns else "total_accidents"
        if target_base not in df.columns:
            return df

        grouped = df.groupby(self.junction_col)[target_base]

        # 1. Direct Prior Lags (shift 1, 2, 3)
        df["accidents_lag_1"] = grouped.shift(1).fillna(0.0)
        df["accidents_lag_2"] = grouped.shift(2).fillna(0.0)
        df["accidents_lag_3"] = grouped.shift(3).fillna(0.0)

        # 2. Shifted Rolling Window Statistics (min_periods=1)
        shifted = grouped.shift(1)
        
        df["accidents_rolling_mean_3"] = (
            df.groupby(self.junction_col)[target_base]
            .transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())
            .fillna(0.0)
            .round(3)
        )
        df["accidents_rolling_std_3"] = (
            df.groupby(self.junction_col)[target_base]
            .transform(lambda x: x.shift(1).rolling(3, min_periods=1).std())
            .fillna(0.0)
            .round(3)
        )
        df["accidents_rolling_mean_6"] = (
            df.groupby(self.junction_col)[target_base]
            .transform(lambda x: x.shift(1).rolling(6, min_periods=1).mean())
            .fillna(0.0)
            .round(3)
        )
        df["accidents_rolling_std_6"] = (
            df.groupby(self.junction_col)[target_base]
            .transform(lambda x: x.shift(1).rolling(6, min_periods=1).std())
            .fillna(0.0)
            .round(3)
        )

        # 3. Recent Traffic/Accident Trend (ratio of 3-month rolling mean to 12-month rolling mean)
        acc_1y = df["accidents_1y"] if "accidents_1y" in df.columns else df["accidents_rolling_mean_6"] * 2.0
        denom = acc_1y.replace({0: np.nan}).fillna(1.0)
        df["accidents_trend_3_12"] = ((df["accidents_rolling_mean_3"] * 4.0) / denom).round(3)
        df["accidents_trend_3_12"] = df["accidents_trend_3_12"].clip(0.0, 10.0).fillna(1.0)

        return df
