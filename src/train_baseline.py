"""
NAGPUR PULSE
Logistic Regression Baseline Model

Purpose:
- Train the first baseline classification model
- Evaluate LOW / MEDIUM / HIGH risk classes
- Calculate HIGH-risk precision and recall
- Save the baseline model and metrics

This is a baseline only.
Random Forest and XGBoost will be evaluated afterward.
"""

from pathlib import Path
import json
import joblib
import pandas as pd

from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression

from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)


# ============================================================
# CONFIGURATION
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

TRAIN_PATH = PROJECT_ROOT / "data" / "processed" / "train.csv"
TEST_PATH = PROJECT_ROOT / "data" / "processed" / "test.csv"

MODEL_DIR = PROJECT_ROOT / "models"
METRICS_DIR = PROJECT_ROOT / "metrics"

MODEL_DIR.mkdir(parents=True, exist_ok=True)
METRICS_DIR.mkdir(parents=True, exist_ok=True)


# Target column
TARGET_COLUMN = "risk_level"

# Features currently available in our engineered dataset
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
# HELPER FUNCTION
# ============================================================

def print_section(title):
    print()
    print("=" * 75)
    print(title)
    print("=" * 75)


# ============================================================
# LOAD DATA
# ============================================================

def load_data():

    print_section("NAGPUR PULSE - LOGISTIC REGRESSION BASELINE")

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
# PREPARE FEATURES
# ============================================================

def prepare_features(train_df, test_df):

    print_section("FEATURE PREPARATION")

    # Verify target
    if TARGET_COLUMN not in train_df.columns:
        raise ValueError(
            f"Target column '{TARGET_COLUMN}' not found in training data."
        )

    if TARGET_COLUMN not in test_df.columns:
        raise ValueError(
            f"Target column '{TARGET_COLUMN}' not found in test data."
        )

    # Verify features
    missing_train = [
        feature
        for feature in ALL_FEATURES
        if feature not in train_df.columns
    ]

    missing_test = [
        feature
        for feature in ALL_FEATURES
        if feature not in test_df.columns
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

    print("\nTraining classes:")
    print(y_train.value_counts())

    print("\nTest classes:")
    print(y_test.value_counts())

    return X_train, X_test, y_train, y_test


# ============================================================
# CREATE PREPROCESSING PIPELINE
# ============================================================

def create_pipeline():

    print_section("CREATING PREPROCESSING PIPELINE")

    # Numerical preprocessing
    numeric_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="median"),
            ),
            (
                "scaler",
                StandardScaler(),
            ),
        ]
    )

    # Categorical preprocessing
    categorical_pipeline = Pipeline(
        steps=[
            (
                "imputer",
                SimpleImputer(strategy="most_frequent"),
            ),
            (
                "onehot",
                OneHotEncoder(
                    handle_unknown="ignore"
                ),
            ),
        ]
    )

    # Combined preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            (
                "numeric",
                numeric_pipeline,
                NUMERIC_FEATURES,
            ),
            (
                "categorical",
                categorical_pipeline,
                CATEGORICAL_FEATURES,
            ),
        ]
    )

    # Logistic Regression
    classifier = LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )

    # Complete pipeline
    model_pipeline = Pipeline(
        steps=[
            (
                "preprocessor",
                preprocessor,
            ),
            (
                "classifier",
                classifier,
            ),
        ]
    )

    return model_pipeline


# ============================================================
# TRAIN MODEL
# ============================================================

def train_model(model_pipeline, X_train, y_train):

    print_section("TRAINING LOGISTIC REGRESSION")

    print("\nTraining Logistic Regression...")

    model_pipeline.fit(
        X_train,
        y_train
    )

    print("Training complete.")

    return model_pipeline


# ============================================================
# EVALUATION
# ============================================================

def evaluate_model(model_pipeline, X_test, y_test):

    print_section("BASELINE EVALUATION")

    # Predictions
    y_pred = model_pipeline.predict(X_test)

    # --------------------------------------------------------
    # Overall metrics
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # HIGH risk metrics
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Classification report
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Confusion matrix
    # --------------------------------------------------------

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

    # --------------------------------------------------------
    # Console output
    # --------------------------------------------------------

    print("\nBASELINE RESULTS")
    print("-" * 75)

    print(f"Accuracy       : {accuracy:.4f}")
    print(f"Weighted Prec. : {weighted_precision:.4f}")
    print(f"Weighted Recall: {weighted_recall:.4f}")
    print(f"Weighted F1    : {weighted_f1:.4f}")

    print("\nHIGH-RISK METRICS")
    print("-" * 75)

    print(f"HIGH Precision : {high_precision:.4f}")
    print(f"HIGH Recall    : {high_recall:.4f}")
    print(f"HIGH F1        : {high_f1:.4f}")

    print("\nSAFETY TARGET")
    print("-" * 75)

    if high_precision >= 0.90:
        print("HIGH-risk precision target >= 90% : PASSED")
    else:
        print("HIGH-risk precision target >= 90% : NOT YET ACHIEVED")

    print("\nCLASSIFICATION REPORT")
    print("-" * 75)

    print(report)

    print("CONFUSION MATRIX")
    print("-" * 75)

    print("Labels: LOW, MEDIUM, HIGH")
    print()

    print(cm)

    # --------------------------------------------------------
    # Create metrics dictionary
    # --------------------------------------------------------

    metrics = {
        "model": "LogisticRegression",
        "model_version": "baseline-v1",
        "target": TARGET_COLUMN,
        "classes": labels,
        "random_state": RANDOM_STATE,

        "test_rows": int(len(y_test)),

        "accuracy": float(accuracy),

        "weighted_precision": float(
            weighted_precision
        ),

        "weighted_recall": float(
            weighted_recall
        ),

        "weighted_f1": float(
            weighted_f1
        ),

        "high_precision": float(
            high_precision
        ),

        "high_recall": float(
            high_recall
        ),

        "high_f1": float(
            high_f1
        ),

        "high_precision_target": 0.90,

        "high_precision_target_passed": bool(
            high_precision >= 0.90
        ),

        "confusion_matrix": cm.tolist(),

        "features": ALL_FEATURES,
    }

    return metrics, y_pred


# ============================================================
# SAVE MODEL
# ============================================================

def save_model(model_pipeline):

    print_section("SAVING BASELINE MODEL")

    model_path = MODEL_DIR / "logistic_regression_baseline.joblib"

    joblib.dump(
        model_pipeline,
        model_path
    )

    print(f"Model saved:")
    print(model_path)

    return model_path


# ============================================================
# SAVE METRICS
# ============================================================

def save_metrics(metrics):

    metrics_path = METRICS_DIR / "logistic_regression_baseline.json"

    with open(
        metrics_path,
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            metrics,
            file,
            indent=4
        )

    print(f"\nMetrics saved:")
    print(metrics_path)

    return metrics_path


# ============================================================
# TEST MODEL AFTER SAVING
# ============================================================

def verify_saved_model(
    model_path,
    X_test
):

    print_section("MODEL RELOAD TEST")

    print("Reloading saved model...")

    loaded_model = joblib.load(
        model_path
    )

    predictions = loaded_model.predict(
        X_test.head(5)
    )

    print("Reload successful.")

    print("\nSample predictions:")

    for index, prediction in enumerate(
        predictions,
        start=1
    ):

        print(
            f"Sample {index}: {prediction}"
        )


# ============================================================
# MAIN
# ============================================================

def main():

    try:

        # 1. Load
        train_df, test_df = load_data()

        # 2. Prepare
        X_train, X_test, y_train, y_test = prepare_features(
            train_df,
            test_df
        )

        # 3. Pipeline
        model_pipeline = create_pipeline()

        # 4. Train
        model_pipeline = train_model(
            model_pipeline,
            X_train,
            y_train
        )

        # 5. Evaluate
        metrics, y_pred = evaluate_model(
            model_pipeline,
            X_test,
            y_test
        )

        # 6. Save model
        model_path = save_model(
            model_pipeline
        )

        # 7. Save metrics
        metrics_path = save_metrics(
            metrics
        )

        # 8. Reload test
        verify_saved_model(
            model_path,
            X_test
        )

        print_section(
            "LOGISTIC REGRESSION BASELINE COMPLETE"
        )

        print("\nFiles created:")

        print(
            f"Model   : {model_path}"
        )

        print(
            f"Metrics : {metrics_path}"
        )

        print("\nNext step:")
        print(
            "Train and evaluate Random Forest with 5-fold cross-validation."
        )

    except Exception as error:

        print_section("ERROR")

        print(
            f"{type(error).__name__}: {error}"
        )

        raise


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    main()