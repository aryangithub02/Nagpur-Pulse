"""
Traffic Feature Engineering Module.
Derives traffic ratios, density indicators, and speed capacity metrics safely.
"""

import pandas as pd
import numpy as np


class TrafficFeatureExtractor:
    """
    Derives traffic ratios and density features with division-by-zero protection.
    """

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        # Volume / Capacity Ratio if both exist
        if "traffic_volume" in df.columns and "road_capacity" in df.columns:
            capacity = df["road_capacity"].replace({0: np.nan}).fillna(1000)
            df["volume_capacity_ratio"] = (df["traffic_volume"] / capacity).round(4)
            df["volume_capacity_ratio"] = df["volume_capacity_ratio"].clip(0.0, 5.0)

        # Speed Ratio if average speed and free-flow speed exist
        if "average_speed" in df.columns and "free_flow_speed" in df.columns:
            ff_speed = df["free_flow_speed"].replace({0: np.nan}).fillna(50)
            df["speed_ratio"] = (df["average_speed"] / ff_speed).round(4)
            df["speed_ratio"] = df["speed_ratio"].clip(0.0, 2.0)

        return df
