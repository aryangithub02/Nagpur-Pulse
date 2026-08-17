"""
Spatial & Geospatial Feature Engineering Module.
Computes spatial distance metrics and nearby high-risk hotspot densities.
"""

import pandas as pd
import numpy as np
from ml.features.junction import haversine_distance

# Key High-Risk Traffic Hotspots in Nagpur
HIGH_RISK_HOTSPOTS = {
    "Sitabuldi_Interchange": (21.1450, 79.0830),
    "LIC_Chowk": (21.1520, 79.0880),
    "Automotive_Square": (21.1950, 79.0950),
}


class SpatialFeatureExtractor:
    """
    Computes spatial proximity to key traffic bottlenecks and hotspots in Nagpur.
    """

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        if "latitude" not in df.columns or "longitude" not in df.columns:
            return df

        for hotspot_name, (h_lat, h_lon) in HIGH_RISK_HOTSPOTS.items():
            col_name = f"dist_to_{hotspot_name.lower()}"
            df[col_name] = [
                haversine_distance(lat, lon, h_lat, h_lon)
                for lat, lon in zip(df["latitude"], df["longitude"])
            ]

        # Minimum distance to any major bottleneck
        hotspot_cols = [f"dist_to_{h.lower()}" for h in HIGH_RISK_HOTSPOTS.keys()]
        df["dist_to_nearest_hotspot"] = df[hotspot_cols].min(axis=1).round(3)

        return df
