import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, LabelEncoder

from xgboost import XGBClassifier


# ============================================================
# CONFIGURATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

TRAIN_PATH = BASE_DIR / "data" / "processed" / "train.csv"
TEST_PATH = BASE_DIR / "data" / "processed" / "test.csv"

MODEL_DIR = BASE_DIR / "models"
METRICS_DIR = BASE_DIR / "metrics"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
METRICS_DIR.mkdir(parents=True, exist_ok=True)

MODEL_PATH = MODEL_DIR / "xgboost_v1.joblib"
METRICS_PATH = METRICS_DIR / "xgboost_v1.json"

RANDOM_STATE = 42

TARGET = "risk_level"

LABELS = ["LOW", "MEDIUM", "HIGH"]

LABEL_MAP = {
    "LOW": 0,
    "MEDIUM": 1,
    "HIGH": 2,
}


# ============================================================
# FEATURES
# ============================================================

NUMERIC_FEATURES = [
    "accidents_7d",
    "accidents_30d",
    "accidents_90d",
    "accidents_1y",
    "fatal_accidents_1y",
    "injury_accidents_1y",
    "historical_accident_rate",
]

CATEGORICAL_FEATURES = [
    "junction",
]

FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


# ============================================================
# DISPLAY
# ============================================================

def header(title):
    print()
    print("=" * 80)
    print(title)
    print("=" * 80)


# ============================================================
# LOAD DATA
# ============================================================

def load_data():

    header("NAGPUR PULSE - XGBOOST PRIMARY MODEL")

    print()
    print("Loading datasets...")

    train_df = pd.read_csv(TRAIN_PATH)
    test_df = pd.read_csv(TEST_PATH)

    print(f"Train rows: {len(train_df)}")
    print(f"Test rows : {len(test_df)}")

    return train_df, test_df


# ============================================================
# PREPARE FEATURES
# ============================================================

def prepare_features(train_df, test_df):

    header("FEATURE PREPARATION")

    missing_train = [c for c in FEATURES if c not in train_df.columns]
    missing_test = [c for c in FEATURES if c not in test_df.columns]

    if missing_train:
        raise ValueError(
            f"Missing training features: {missing_train}"
        )

    if missing_test:
        raise ValueError(
            f"Missing test features: {missing_test}"
        )

    X_train = train_df[FEATURES].copy()
    X_test = test_df[FEATURES].copy()

    y_train = train_df[TARGET].map(LABEL_MAP)
    y_test = test_df[TARGET].map(LABEL_MAP)

    if y_train.isna().any():
        raise ValueError("Unknown target class found in training data.")

    if y_test.isna().any():
        raise ValueError("Unknown target class found in test data.")

    y_train = y_train.astype(int)
    y_test = y_test.astype(int)

    print()
    print("Features:")

    for feature in FEATURES:
        print(f" - {feature}")

    print()
    print("Training class distribution:")
    print(train_df[TARGET].value_counts())

    print()
    print("Test class distribution:")
    print(test_df[TARGET].value_counts())

    return X_train, X_test, y_train, y_test


# ============================================================
# PREPROCESSING
# ============================================================

def create_preprocessor():

    numeric_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="median")
            )
        ]
    )

    categorical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="most_frequent")
            ),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore",
                    sparse_output=False
                )
            ),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numeric",
                numeric_pipeline,
                NUMERIC_FEATURES
            ),
            (
                "categorical",
                categorical_pipeline,
                CATEGORICAL_FEATURES
            ),
        ]
    )

    return preprocessor


# ============================================================
# MODEL
# ============================================================

def create_model():

    model = XGBClassifier(
        objective="multi:softprob",
        num_class=3,

        n_estimators=250,
        max_depth=4,
        learning_rate=0.05,

        subsample=0.8,
        colsample_bytree=0.8,

        min_child_weight=3,
        gamma=0.1,

        reg_alpha=0.1,
        reg_lambda=1.0,

        eval_metric="mlogloss",

        random_state=RANDOM_STATE,
        n_jobs=-1,
    )

    return model


# ============================================================
# PIPELINE
# ============================================================

def create_pipeline():

    preprocessor = create_preprocessor()
    model = create_model()

    pipeline = Pipeline(
        steps=[
            (
                "preprocessing",
                preprocessor
            ),
            (
                "model",
                model
            ),
        ]
    )

    return pipeline


# ============================================================
# CROSS VALIDATION
# ============================================================

def run_cross_validation(pipeline, X_train, y_train):

    header("5-FOLD CROSS VALIDATION")

    print()
    print("Cross-validation is performed ONLY on TRAIN data.")
    print("The final TEST dataset remains untouched.")

    cv = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=RANDOM_STATE
    )

    scoring = {
        "accuracy": "accuracy",
        "precision_weighted": "precision_weighted",
        "recall_weighted": "recall_weighted",
        "f1_weighted": "f1_weighted",
    }

    results = cross_validate(
        pipeline,
        X_train,
        y_train,
        cv=cv,
        scoring=scoring,
        return_train_score=True,
        n_jobs=1,
    )

    print()
    print("XGBOOST CROSS-VALIDATION RESULTS")
    print("-" * 80)

    cv_metrics = {}

    for metric in scoring.keys():

        test_values = results[f"test_{metric}"]
        train_values = results[f"train_{metric}"]

        test_mean = float(np.mean(test_values))
        test_std = float(np.std(test_values))

        train_mean = float(np.mean(train_values))

        cv_metrics[metric] = {
            "mean": test_mean,
            "std": test_std,
            "train_mean": train_mean,
        }

        print(
            f"{metric:22s}: "
            f"{test_mean:.4f} +/- {test_std:.4f}"
        )

        print(
            f"{'train_' + metric:22s}: "
            f"{train_mean:.4f}"
        )

    return cv_metrics


# ============================================================
# TRAIN
# ============================================================

def train_final_model(pipeline, X_train, y_train):

    header("TRAINING FINAL XGBOOST MODEL")

    print()
    print("Training on complete TRAIN dataset...")

    pipeline.fit(X_train, y_train)

    print("Training complete.")

    return pipeline


# ============================================================
# EVALUATION
# ============================================================

def evaluate_model(pipeline, X_test, y_test):

    header("FINAL TEST EVALUATION")

    print()
    print("The TEST dataset has remained untouched during CV.")

    predictions = pipeline.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)

    weighted_precision = precision_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    weighted_recall = recall_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    weighted_f1 = f1_score(
        y_test,
        predictions,
        average="weighted",
        zero_division=0
    )

    high_precision = precision_score(
        y_test,
        predictions,
        labels=[LABEL_MAP["HIGH"]],
        average="macro",
        zero_division=0
    )

    high_recall = recall_score(
        y_test,
        predictions,
        labels=[LABEL_MAP["HIGH"]],
        average="macro",
        zero_division=0
    )

    high_f1 = f1_score(
        y_test,
        predictions,
        labels=[LABEL_MAP["HIGH"]],
        average="macro",
        zero_division=0
    )

    print()
    print("XGBOOST TEST RESULTS")
    print("-" * 80)

    print(f"Accuracy       : {accuracy:.4f}")
    print(f"Weighted Prec. : {weighted_precision:.4f}")
    print(f"Weighted Recall: {weighted_recall:.4f}")
    print(f"Weighted F1    : {weighted_f1:.4f}")

    print()
    print("HIGH-RISK METRICS")
    print("-" * 80)

    print(f"HIGH Precision : {high_precision:.4f}")
    print(f"HIGH Recall    : {high_recall:.4f}")
    print(f"HIGH F1        : {high_f1:.4f}")

    print()
    print("SAFETY TARGET")
    print("-" * 80)

    if high_precision >= 0.90:
        print(
            "HIGH-risk precision target >= 90% : ACHIEVED"
        )
    else:
        print(
            "HIGH-risk precision target >= 90% : NOT YET ACHIEVED"
        )

    print()
    print("CLASSIFICATION REPORT")
    print("-" * 80)

    print(
        classification_report(
            y_test,
            predictions,
            labels=[0, 1, 2],
            target_names=LABELS,
            zero_division=0
        )
    )

    print("CONFUSION MATRIX")
    print("-" * 80)
    print("Labels: LOW, MEDIUM, HIGH")
    print()
    print(confusion_matrix(
        y_test,
        predictions,
        labels=[0, 1, 2]
    ))

    metrics = {
        "accuracy": float(accuracy),
        "weighted_precision": float(weighted_precision),
        "weighted_recall": float(weighted_recall),
        "weighted_f1": float(weighted_f1),
        "high_precision": float(high_precision),
        "high_recall": float(high_recall),
        "high_f1": float(high_f1),
        "high_precision_target": 0.90,
        "high_precision_target_achieved": bool(
            high_precision >= 0.90
        ),
        "classification_report": classification_report(
            y_test,
            predictions,
            labels=[0, 1, 2],
            target_names=LABELS,
            output_dict=True,
            zero_division=0
        ),
        "confusion_matrix": confusion_matrix(
            y_test,
            predictions,
            labels=[0, 1, 2]
        ).tolist(),
    }

    return metrics


# ============================================================
# SAVE MODEL
# ============================================================

def save_model(pipeline, metrics, cv_metrics):

    header("SAVING XGBOOST MODEL")

    joblib.dump(
        pipeline,
        MODEL_PATH
    )

    print()
    print("Model saved:")
    print(MODEL_PATH)

    complete_metrics = {
        "model_name": "XGBoost",
        "model_version": "traffic-risk-xgb-v1",
        "random_state": RANDOM_STATE,
        "features": FEATURES,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "target": TARGET,
        "target_classes": LABELS,
        "cross_validation": cv_metrics,
        "test_metrics": metrics,
    }

    with open(
        METRICS_PATH,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            complete_metrics,
            f,
            indent=4
        )

    print()
    print("Metrics saved:")
    print(METRICS_PATH)


# ============================================================
# RELOAD TEST
# ============================================================

def reload_test(X_test):

    header("MODEL RELOAD TEST")

    print()
    print("Reloading XGBoost model...")

    loaded_model = joblib.load(MODEL_PATH)

    print("Reload successful.")

    sample = X_test.head(5)

    predictions = loaded_model.predict(sample)

    probabilities = loaded_model.predict_proba(sample)

    print()
    print("Sample predictions:")

    for i, prediction in enumerate(predictions, start=1):

        label = LABELS[int(prediction)]

        confidence = float(
            np.max(probabilities[i - 1])
        )

        print(
            f"Sample {i}: "
            f"{label} "
            f"(confidence={confidence:.4f})"
        )


# ============================================================
# MAIN
# ============================================================

def main():

    train_df, test_df = load_data()

    X_train, X_test, y_train, y_test = prepare_features(
        train_df,
        test_df
    )

    pipeline = create_pipeline()

    cv_metrics = run_cross_validation(
        pipeline,
        X_train,
        y_train
    )

    pipeline = train_final_model(
        pipeline,
        X_train,
        y_train
    )

    test_metrics = evaluate_model(
        pipeline,
        X_test,
        y_test
    )

    save_model(
        pipeline,
        test_metrics,
        cv_metrics
    )

    reload_test(X_test)

    header("XGBOOST COMPLETE")

    print()
    print("Files created:")
    print(f"Model   : {MODEL_PATH}")
    print(f"Metrics : {METRICS_PATH}")

    print()
    print("Next step:")
    print("Compare Logistic Regression vs Random Forest vs XGBoost.")
    print("Then perform probability calibration and confidence thresholding.")


if __name__ == "__main__":
    main()