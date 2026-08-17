"""
Main Reusable FeaturePipeline Orchestrator for Nagpur Pulse ML Service.
Applies Temporal, Traffic, Historical Incident, Junction, Weather, Spatial, and Categorical Encoders.
"""

from typing import Dict, Any, List, Tuple, Optional
import pandas as pd
import numpy as np
import logging

from ml.features.temporal import TemporalFeatureExtractor
from ml.features.traffic import TrafficFeatureExtractor
from ml.features.incidents import HistoricalIncidentFeatureExtractor
from ml.features.junction import JunctionFeatureExtractor
from ml.features.weather import WeatherFeatureExtractor
from ml.features.spatial import SpatialFeatureExtractor
from ml.features.encoding import LeakageFreeCategoricalEncoder
from ml.features.validation import drop_constant_and_duplicate_features, validate_feature_schema_consistency, audit_feature_leakage

logger = logging.getLogger("NagpurPulse.FeaturePipeline")


class FeaturePipeline:
    """
    Scikit-Learn style reusable feature engineering pipeline providing fit() and transform().
    """

    def __init__(self):
        self.temporal_extractor = TemporalFeatureExtractor()
        self.traffic_extractor = TrafficFeatureExtractor()
        self.incident_extractor = HistoricalIncidentFeatureExtractor()
        self.junction_extractor = JunctionFeatureExtractor()
        self.weather_extractor = WeatherFeatureExtractor()
        self.spatial_extractor = SpatialFeatureExtractor()
        self.encoder = LeakageFreeCategoricalEncoder()

        self.constant_cols_to_drop: List[str] = []
        self.final_feature_names: List[str] = []
        self.is_fitted = False

    def fit(self, train_df: pd.DataFrame, target_col: str = "risk_score") -> "FeaturePipeline":
        """
        Fit all stateful encoders and feature selectors strictly on training data.
        """
        logger.info("Fitting FeaturePipeline on Training set...")
        df = train_df.copy()

        # Apply feature extractors
        df = self.temporal_extractor.transform(df)
        df = self.traffic_extractor.transform(df)
        df = self.incident_extractor.transform(df)
        df = self.junction_extractor.transform(df)
        df = self.weather_extractor.transform(df)
        df = self.spatial_extractor.transform(df)

        # Fit categorical encoder on train
        self.encoder.fit(df, target_col=target_col)
        df = self.encoder.transform(df)

        # Drop constant zero-variance features from train
        num_df = df.select_dtypes(include=[np.number])
        _, self.constant_cols_to_drop = drop_constant_and_duplicate_features(num_df)

        # Determine canonical ordered feature names (excluding target columns and metadata)
        exclude_cols = {"traffic_risk", "risk_score", "period_date", "junction", "zone", "priority_level"}
        exclude_cols.update(self.constant_cols_to_drop)

        self.final_feature_names = [c for c in df.columns if c not in exclude_cols]
        self.is_fitted = True
        logger.info(f"FeaturePipeline successfully fitted. Total engineered features: {len(self.final_feature_names)}")
        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform any split (Train, Validation, or Test) using pipeline state learned from training.
        """
        if not self.is_fitted:
            raise RuntimeError("Pipeline must be fitted on training data before transform()")

        df = df.copy()

        # Apply feature extractors
        df = self.temporal_extractor.transform(df)
        df = self.traffic_extractor.transform(df)
        df = self.incident_extractor.transform(df)
        df = self.junction_extractor.transform(df)
        df = self.weather_extractor.transform(df)
        df = self.spatial_extractor.transform(df)

        # Apply fitted encoder
        df = self.encoder.transform(df)

        # Fill NaNs in numeric features with 0.0
        num_cols = df.select_dtypes(include=[np.number]).columns
        df[num_cols] = df[num_cols].fillna(0.0)

        # Reindex to exact feature names list to guarantee 100% schema consistency across splits
        output_cols = []
        # Preserve metadata / target columns if present
        for col in ["junction", "period_date", "traffic_risk", "risk_score"]:
            if col in df.columns:
                output_cols.append(col)

        output_cols.extend(self.final_feature_names)
        
        # Ensure all expected feature columns exist
        for col in self.final_feature_names:
            if col not in df.columns:
                df[col] = 0.0

        return df[output_cols].copy()

    def fit_transform(self, train_df: pd.DataFrame, target_col: str = "risk_score") -> pd.DataFrame:
        """
        Fit on training set and return transformed training feature set.
        """
        self.fit(train_df, target_col=target_col)
        return self.transform(train_df)
