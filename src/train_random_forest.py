"""
NAGPUR PULSE
Random Forest Model + 5-Fold Cross Validation

Purpose:
- Train Random Forest
- Perform 5-fold stratified cross-validation on TRAIN only
- Compare CV performance
- Evaluate once on untouched TEST set
- Calculate HIGH-risk precision/recall
- Save model and metrics
"""

from pathlib import Path
import json
import joblib
import pandas as pd
import numpy as np

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.impute import SimpleImputer

from sklearn.ensemble import RandomForestClassifier

from sklearn.model_selection import StratifiedKFold, cross_validate

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)


# ============================================================
# CONFIG
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

TRAIN_PATH = PROJECT_ROOT / "data" / "processed" / "train.csv"
TEST_PATH = PROJECT_ROOT / "data" / "processed" / "test.csv"

MODEL_DIR = PROJECT_ROOT / "models"
METRICS_DIR = PROJECT_ROOT / "metrics"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
METRICS_DIR.mkdir(parents=True, exist_ok=True)

TARGET_COLUMN = "risk_level"

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

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

RANDOM_STATE = 42


# ============================================================
# SECTION PRINT
# ============================================================

def section(title):

    print()
    print("=" * 80)
    print(title)
    print("=" * 80)


# ============================================================
# LOAD DATA
# ============================================================

def load_data():

    section("NAGPUR PULSE - RANDOM FOREST")

    print("\nLoading datasets...")

    if not TRAIN_PATH.exists():
        raise FileNotFoundError(
            f"Training dataset not found:\n{TRAIN_PATH}"
        )

    if not TEST_PATH.exists():
        raise FileNotFoundError(
            f"Test dataset not found:\n{TEST_PATH}"
        )

    train_df = pd.read_csv(TRAIN_PATH)
    test_df = pd.read_csv(TEST_PATH)

    print(f"Train rows: {len(train_df)}")
    print(f"Test rows : {len(test_df)}")

    return train_df, test_df


# ============================================================
# PREPARE DATA
# ============================================================

def prepare_data(train_df, test_df):

    section("FEATURE PREPARATION")

    missing_train = [
        col for col in ALL_FEATURES
        if col not in train_df.columns
    ]

    missing_test = [
        col for col in ALL_FEATURES
        if col not in test_df.columns
    ]

    if missing_train:
        raise ValueError(
            f"Missing training features: {missing_train}"
        )

    if missing_test:
        raise ValueError(
            f"Missing test features: {missing_test}"
        )

    X_train = train_df[ALL_FEATURES].copy()
    y_train = train_df[TARGET_COLUMN].astype(str)

    X_test = test_df[ALL_FEATURES].copy()
    y_test = test_df[TARGET_COLUMN].astype(str)

    print("\nFeatures:")

    for feature in ALL_FEATURES:
        print(f" - {feature}")

    print("\nTraining class distribution:")
    print(y_train.value_counts())

    print("\nTest class distribution:")
    print(y_test.value_counts())

    return X_train, X_test, y_train, y_test


# ============================================================
# CREATE PREPROCESSOR
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
                "onehot",
                OneHotEncoder(
                    handle_unknown="ignore"
                )
            )
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
            )
        ]
    )

    return preprocessor


# ============================================================
# CREATE RANDOM FOREST
# ============================================================

def create_model():

    preprocessor = create_preprocessor()

    classifier = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight="balanced",
        random_state=RANDOM_STATE,
        n_jobs=-1
    )

    pipeline = Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor
            ),
            (
                "classifier",
                classifier
            )
        ]
    )

    return pipeline


# ============================================================
# 5-FOLD CROSS VALIDATION
# ============================================================

def cross_validate_model(model, X_train, y_train):

    section("5-FOLD CROSS VALIDATION")

    print(
        "\nIMPORTANT: Cross-validation is performed only on TRAIN data."
    )

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
        model,
        X_train,
        y_train,
        cv=cv,
        scoring=scoring,
        n_jobs=-1,
        return_train_score=True
    )

    print("\nCROSS-VALIDATION RESULTS")
    print("-" * 80)

    for metric in scoring.keys():

        test_values = results[
            f"test_{metric}"
        ]

        train_values = results[
            f"train_{metric}"
        ]

        print(
            f"{metric:22s}: "
            f"{test_values.mean():.4f} "
            f"+/- {test_values.std():.4f}"
        )

        print(
            f"{'train_' + metric:22s}: "
            f"{train_values.mean():.4f}"
        )

    cv_metrics = {}

    for metric in scoring.keys():

        values = results[
            f"test_{metric}"
        ]

        cv_metrics[metric] = {
            "mean": float(values.mean()),
            "std": float(values.std()),
            "fold_scores": [
                float(value)
                for value in values
            ]
        }

    return cv_metrics


# ============================================================
# TRAIN FINAL RANDOM FOREST
# ============================================================

def train_final_model(model, X_train, y_train):

    section("TRAINING FINAL RANDOM FOREST")

    print("\nTraining on complete TRAIN dataset...")

    model.fit(
        X_train,
        y_train
    )

    print("Training complete.")

    return model


# ============================================================
# TEST EVALUATION
# ============================================================

def evaluate_test(model, X_test, y_test):

    section("FINAL TEST EVALUATION")

    print(
        "\nThe TEST dataset has remained untouched during CV."
    )

    y_pred = model.predict(X_test)

    # Overall
    accuracy = accuracy_score(
        y_test,
        y_pred
    )

    weighted_precision = precision_score(
        y_test,
        y_pred,
        average="weighted",
        zero_division=0
    )

    weighted_recall = recall_score(
        y_test,
        y_pred,
        average="weighted",
        zero_division=0
    )

    weighted_f1 = f1_score(
        y_test,
        y_pred,
        average="weighted",
        zero_division=0
    )

    # HIGH-risk metrics
    high_precision = precision_score(
        y_test,
        y_pred,
        labels=["HIGH"],
        average=None,
        zero_division=0
    )[0]

    high_recall = recall_score(
        y_test,
        y_pred,
        labels=["HIGH"],
        average=None,
        zero_division=0
    )[0]

    high_f1 = f1_score(
        y_test,
        y_pred,
        labels=["HIGH"],
        average=None,
        zero_division=0
    )[0]

    # Report
    report = classification_report(
        y_test,
        y_pred,
        labels=[
            "LOW",
            "MEDIUM",
            "HIGH"
        ],
        zero_division=0
    )

    labels = [
        "LOW",
        "MEDIUM",
        "HIGH"
    ]

    cm = confusion_matrix(
        y_test,
        y_pred,
        labels=labels
    )

    print("\nRANDOM FOREST TEST RESULTS")
    print("-" * 80)

    print(f"Accuracy       : {accuracy:.4f}")
    print(f"Weighted Prec. : {weighted_precision:.4f}")
    print(f"Weighted Recall: {weighted_recall:.4f}")
    print(f"Weighted F1    : {weighted_f1:.4f}")

    print("\nHIGH-RISK METRICS")
    print("-" * 80)

    print(f"HIGH Precision : {high_precision:.4f}")
    print(f"HIGH Recall    : {high_recall:.4f}")
    print(f"HIGH F1        : {high_f1:.4f}")

    print("\nCLASSIFICATION REPORT")
    print("-" * 80)

    print(report)

    print("CONFUSION MATRIX")
    print("-" * 80)

    print("Labels: LOW, MEDIUM, HIGH")
    print()

    print(cm)

    metrics = {
        "model": "RandomForest",
        "model_version": "random-forest-v1",
        "target": TARGET_COLUMN,
        "classes": labels,
        "test_rows": int(len(y_test)),
        "accuracy": float(accuracy),
        "weighted_precision": float(weighted_precision),
        "weighted_recall": float(weighted_recall),
        "weighted_f1": float(weighted_f1),
        "high_precision": float(high_precision),
        "high_recall": float(high_recall),
        "high_f1": float(high_f1),
        "high_precision_target": 0.90,
        "high_precision_target_passed": bool(
            high_precision >= 0.90
        ),
        "confusion_matrix": cm.tolist(),
        "features": ALL_FEATURES
    }

    return metrics


# ============================================================
# SAVE MODEL
# ============================================================

def save_model(model):

    section("SAVING RANDOM FOREST MODEL")

    model_path = (
        MODEL_DIR /
        "random_forest_v1.joblib"
    )

    joblib.dump(
        model,
        model_path
    )

    print("Model saved:")
    print(model_path)

    return model_path


# ============================================================
# SAVE METRICS
# ============================================================

def save_metrics(cv_metrics, test_metrics):

    metrics_path = (
        METRICS_DIR /
        "random_forest_v1.json"
    )

    output = {
        "model": "RandomForest",
        "model_version": "random-forest-v1",

        "cross_validation": cv_metrics,

        "test_metrics": test_metrics
    }

    with open(
        metrics_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            output,
            file,
            indent=4
        )

    print("\nMetrics saved:")
    print(metrics_path)

    return metrics_path


# ============================================================
# MODEL RELOAD TEST
# ============================================================

def verify_model(model_path, X_test):

    section("MODEL RELOAD TEST")

    print("Reloading Random Forest model...")

    loaded_model = joblib.load(
        model_path
    )

    predictions = loaded_model.predict(
        X_test.head(5)
    )

    print("Reload successful.")

    print("\nSample predictions:")

    for i, prediction in enumerate(
        predictions,
        start=1
    ):

        print(
            f"Sample {i}: {prediction}"
        )


# ============================================================
# MAIN
# ============================================================

def main():

    train_df, test_df = load_data()

    X_train, X_test, y_train, y_test = prepare_data(
        train_df,
        test_df
    )

    model = create_model()

    # 1. Cross-validation
    cv_metrics = cross_validate_model(
        model,
        X_train,
        y_train
    )

    # 2. Train final model
    model = train_final_model(
        model,
        X_train,
        y_train
    )

    # 3. Final untouched test
    test_metrics = evaluate_test(
        model,
        X_test,
        y_test
    )

    # 4. Save
    model_path = save_model(
        model
    )

    save_metrics(
        cv_metrics,
        test_metrics
    )

    # 5. Reload test
    verify_model(
        model_path,
        X_test
    )

    section("RANDOM FOREST COMPLETE")

    print("\nNext step:")
    print(
        "Compare Logistic Regression vs Random Forest."
    )

    print(
        "Then train XGBoost as the primary model."
    )


if __name__ == "__main__":
    main()