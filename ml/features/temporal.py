"""
Temporal and Cyclical Feature Engineering Module.
Extracts calendar features and encodes periodic variables using sine/cosine transformations.
"""

from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np


class TemporalFeatureExtractor:
    """
    Extracts time-based and cyclical features from date/timestamp columns.
    """

    def __init__(
        self,
        date_col: str = "period_date",
        morning_peak: tuple = (7, 10),
        evening_peak: tuple = (17, 21),
    ):
        self.date_col = date_col
        self.morning_peak = morning_peak
        self.evening_peak = evening_peak

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Derive temporal and cyclical features from DataFrame.
        """
        df = df.copy()

        if self.date_col not in df.columns:
            # Fallback if period_date missing
            return df

        dates = pd.to_datetime(df[self.date_col], errors="coerce")

        # Basic calendar features
        df["month"] = dates.dt.month.fillna(1).astype(int)
        df["year"] = dates.dt.year.fillna(2020).astype(int)
        df["quarter"] = dates.dt.quarter.fillna(1).astype(int)
        df["is_year_end"] = (dates.dt.is_year_end).astype(int)
        df["is_year_start"] = (dates.dt.is_year_start).astype(int)

        # Cyclical month transformation: period = 12
        df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12.0).round(6)
        df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12.0).round(6)

        # If fine-grained hour / day_of_week present
        if "hour" in df.columns or dates.dt.hour.max() > 0:
            hours = df["hour"] if "hour" in df.columns else dates.dt.hour
            df["hour"] = hours.fillna(12).astype(int)
            df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24.0).round(6)
            df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24.0).round(6)

            # Peak indicators
            df["morning_peak_indicator"] = (
                (df["hour"] >= self.morning_peak[0]) & (df["hour"] <= self.morning_peak[1])
            ).astype(int)
            df["evening_peak_indicator"] = (
                (df["hour"] >= self.evening_peak[0]) & (df["hour"] <= self.evening_peak[1])
            ).astype(int)
            df["peak_hour_indicator"] = (
                (df["morning_peak_indicator"] == 1) | (df["evening_peak_indicator"] == 1)
            ).astype(int)

        if "day_of_week" in df.columns or dates.dt.dayofweek.max() > 0:
            dow = df["day_of_week"] if "day_of_week" in df.columns else dates.dt.dayofweek
            df["day_of_week"] = dow.fillna(0).astype(int)
            df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7.0).round(6)
            df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7.0).round(6)
            df["weekend_indicator"] = (df["day_of_week"] >= 5).astype(int)

        return df
