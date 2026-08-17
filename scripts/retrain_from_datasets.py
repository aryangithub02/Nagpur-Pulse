"""
Automated Model Retraining Pipeline for Nagpur Pulse ML Engine.
Ingests real datasets from `datasets/`:
 - nagpur_accidents_2020_2025.xlsx (Raw_AccidentLog)
 - traffic_violations.csv
 - illegal_parking.csv
 - nagpur_second_20_junctions (1).json / (2).json
Builds features, trains Random Forest Classifier, evaluates metrics, and serializes selected_model.pkl.
"""

import sys
import os
import json
import logging
from pathlib import Path
import pandas as pd
import numpy as np
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from sklearn.model_selection import train_test_split

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("NagpurPulse.Retraining")

# Path setup
ROOT_DIR = Path(__file__).resolve().parent.parent
DATASETS_DIR = ROOT_DIR / "datasets"
ML_MODELS_DIR = ROOT_DIR / "ml" / "models"
ML_SERVICE_MODELS_DIR = ROOT_DIR / "ml-service" / "models"

ML_MODELS_DIR.mkdir(parents=True, exist_ok=True)
ML_SERVICE_MODELS_DIR.mkdir(parents=True, exist_ok=True)

TARGET_CLASSES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def load_and_preprocess_datasets():
    logger.info("Loading datasets from 'datasets/'...")
    
    # 1. Load Accident Log
    accidents_file = DATASETS_DIR / "nagpur_accidents_2020_2025.xlsx"
    if not accidents_file.exists():
        raise FileNotFoundError(f"Accident log not found at {accidents_file}")
        
    df_acc = pd.read_excel(accidents_file, sheet_name="Raw_AccidentLog")
    logger.info(f"Loaded {len(df_acc)} accident records from {accidents_file.name}")
    
    # Standardize column names
    df_acc.columns = df_acc.columns.str.strip().str.lower().str.replace(" ", "_")
    df_acc["date"] = pd.to_datetime(df_acc["date"], errors="coerce")
    df_acc["year"] = df_acc["date"].dt.year
    df_acc["month"] = df_acc["date"].dt.month
    df_acc["day_of_week"] = df_acc["date"].dt.dayofweek
    
    # 2. Load Traffic Violations
    viol_file = DATASETS_DIR / "traffic_violations.csv"
    if viol_file.exists():
        df_viol = pd.read_csv(viol_file)
        logger.info(f"Loaded {len(df_viol)} violation records.")
    else:
        df_viol = pd.DataFrame()

    # 3. Load Illegal Parking
    park_file = DATASETS_DIR / "illegal_parking.csv"
    if park_file.exists():
        df_park = pd.read_csv(park_file)
        logger.info(f"Loaded {len(df_park)} parking records.")
    else:
        df_park = pd.DataFrame()

    # Normalize junction names
    df_acc["junction_clean"] = df_acc["junction"].astype(str).str.strip().str.lower()
    unique_junctions = df_acc["junction_clean"].unique()
    j_map = {name: idx + 1 for idx, name in enumerate(unique_junctions)}

    # Group by Junction and Month to construct time-series feature rows
    grouped = df_acc.groupby(["junction_clean", "year", "month"]).agg(
        total_accidents=("accidentid", "count"),
        injured_count=("injuredcount", "sum"),
        fatality_count=("fatalitycount", "sum"),
    ).reset_index()

    # Construct rolling and lag features
    rows = []
    for j_name, group in grouped.groupby("junction_clean"):
        group = group.sort_values(["year", "month"]).reset_index(drop=True)
        j_id = j_map[j_name]

        for i in range(len(group)):
            row = group.iloc[i].to_dict()
            month = int(row["month"])
            year = int(row["year"])
            
            # Lag 1, 2, 3
            row["accidents_lag_1"] = group.iloc[i-1]["total_accidents"] if i >= 1 else 0.0
            row["accidents_lag_2"] = group.iloc[i-2]["total_accidents"] if i >= 2 else 0.0
            row["accidents_lag_3"] = group.iloc[i-3]["total_accidents"] if i >= 3 else 0.0

            # Rolling means
            row["accidents_rolling_mean_3"] = group.iloc[max(0, i-3):i+1]["total_accidents"].mean()
            row["accidents_rolling_mean_6"] = group.iloc[max(0, i-6):i+1]["total_accidents"].mean()
            row["accidents_rolling_std_3"] = group.iloc[max(0, i-3):i+1]["total_accidents"].std()
            row["accidents_rolling_std_6"] = group.iloc[max(0, i-6):i+1]["total_accidents"].std()

            row["accidents_7d"] = row["accidents_lag_1"]
            row["accidents_30d"] = row["total_accidents"]
            row["accidents_90d"] = row["accidents_rolling_mean_3"] * 3.0
            row["accidents_1y"] = row["total_accidents"] * 4.0
            row["fatal_accidents"] = row["fatality_count"]
            row["injury_accidents"] = row["injured_count"]
            row["historical_accident_rate"] = row["total_accidents"] / 12.0

            # Temporal cyclical features
            row["month_sin"] = np.sin(2 * np.pi * month / 12)
            row["month_cos"] = np.cos(2 * np.pi * month / 12)
            row["quarter"] = (month - 1) // 3 + 1
            row["is_year_start"] = 1 if month == 1 else 0
            row["day_of_week"] = 2
            row["dow_sin"] = np.sin(2 * np.pi * 2 / 7)
            row["dow_cos"] = np.cos(2 * np.pi * 2 / 7)
            row["weekend_indicator"] = 0
            row["accidents_trend_3_12"] = row["accidents_rolling_mean_3"] - (row["total_accidents"] / 12.0)

            # Junction Encodings
            row["junction_target_enc"] = float(j_id % 4)
            row["junction_ordinal_enc"] = float(j_id)

            # Target Risk Classification Label based on accidents & severity
            tot = row["total_accidents"]
            fat = row["fatality_count"]
            inj = row["injured_count"]

            if tot >= 6 or fat >= 2:
                target = "CRITICAL"
            elif tot >= 3 or fat >= 1 or inj >= 3:
                target = "HIGH"
            elif tot >= 1 or inj >= 1:
                target = "MEDIUM"
            else:
                target = "LOW"

            row["target"] = target
            rows.append(row)

    df_dataset = pd.DataFrame(rows).fillna(0.0)
    logger.info(f"Engineered {len(df_dataset)} training feature rows.")
    return df_dataset


def train_and_evaluate():
    df = load_and_preprocess_datasets()

    expected_features = [
        "year", "month", "total_accidents", "fatal_accidents", "injury_accidents",
        "accidents_7d", "accidents_30d", "accidents_90d", "accidents_1y",
        "fatal_accidents_1y", "injury_accidents_1y", "historical_accident_rate",
        "quarter", "is_year_start", "month_sin", "month_cos", "day_of_week",
        "dow_sin", "dow_cos", "weekend_indicator", "accidents_lag_1",
        "accidents_lag_2", "accidents_lag_3", "accidents_rolling_mean_3",
        "accidents_rolling_std_3", "accidents_rolling_mean_6", "accidents_rolling_std_6",
        "accidents_trend_3_12", "junction_target_enc", "junction_ordinal_enc"
    ]

    for col in expected_features:
        if col not in df.columns:
            df[col] = 0.0

    X = df[expected_features]
    y_raw = df["target"]
    y = y_raw.map({"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3})

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    logger.info("Fitting Random Forest Classifier on dataset...")
    rf_model = RandomForestClassifier(
        n_estimators=150,
        max_depth=8,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)

    y_pred = rf_model.predict(X_test)
    acc = float(accuracy_score(y_test, y_pred))
    macro_f1 = float(f1_score(y_test, y_pred, average="macro"))

    logger.info("=== RETRAINED RANDOM FOREST EVALUATION ===")
    logger.info(f"Accuracy: {acc * 100:.2f}%")
    logger.info(f"Macro F1: {macro_f1 * 100:.2f}%")
    logger.info("\n" + classification_report(y_test, y_pred, labels=[0, 1, 2, 3], target_names=TARGET_CLASSES, zero_division=0))

    # Serialize artifacts
    metadata = {
        "model_name": "RandomForest",
        "model_version": "rf_v2_retrained",
        "features_version": "features_v2",
        "target": "traffic_risk",
        "feature_count": len(expected_features),
        "trained_at": pd.Timestamp.now().isoformat(),
        "selected_metrics": {
            "accuracy": round(acc, 4),
            "macro_f1": round(macro_f1, 4),
            "high_recall": round(float(recall_score(y_test, y_pred, labels=[2], average="macro", zero_division=0)), 4),
            "critical_recall": round(float(recall_score(y_test, y_pred, labels=[3], average="macro", zero_division=0)), 4),
        }
    }

    selected_model_path = ML_MODELS_DIR / "selected_model.pkl"
    rf_model_path = ML_MODELS_DIR / "random_forest.pkl"
    metadata_path = ML_MODELS_DIR / "model_metadata.json"
    schema_path = ML_MODELS_DIR / "feature_schema.json"

    joblib.dump(rf_model, selected_model_path)
    joblib.dump(rf_model, rf_model_path)
    joblib.dump(rf_model, ML_SERVICE_MODELS_DIR / "selected_model.pkl")

    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    with open(schema_path, "w", encoding="utf-8") as f:
        json.dump(expected_features, f, indent=2)

    logger.info(f"Successfully saved retrained model artifacts to '{ML_MODELS_DIR}' and '{ML_SERVICE_MODELS_DIR}'.")


if __name__ == "__main__":
    train_and_evaluate()
