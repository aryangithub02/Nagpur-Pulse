"""
Weather Feature Engineering Module.
Processes weather attributes if available, or attaches canonical unavailable status contracts.
"""

from typing import Dict, Any
import pandas as pd
import numpy as np


class WeatherFeatureExtractor:
    """
    Derives weather features or attaches standard non-synthetic default indicators.
    """

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        if "weathercondition" in df.columns or "weather_condition" in df.columns:
            w_col = "weathercondition" if "weathercondition" in df.columns else "weather_condition"
            df["rain_indicator"] = (df[w_col].astype(str).str.upper().str.contains("RAIN|STORM|MONSOON")).astype(int)
            df["poor_visibility_indicator"] = (df[w_col].astype(str).str.upper().str.contains("FOG|SMOG|MIST")).astype(int)
        else:
            # Documented unavailable defaults without synthetic invention
            df["rain_indicator"] = 0
            df["poor_visibility_indicator"] = 0

        return df
