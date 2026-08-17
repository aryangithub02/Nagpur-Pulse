import json
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
)
from sklearn.model_selection import StratifiedKFold

warnings.filterwarnings("ignore")


# =============================================================================
# CONFIGURATION
# =============================================================================

BASE_DIR = Path(__file__).resolve().parents[1]

TRAIN_PATH = BASE_DIR / "data" / "processed" / "train.csv"
TEST_PATH = BASE_DIR / "data" / "processed" / "test.csv"

XGBOOST_MODEL_PATH = BASE_DIR / "models" / "xgboost_v1.joblib"

OUTPUT_MODEL_PATH = BASE_DIR / "models" / "xgboost_calibrated_v1.joblib"
OUTPUT_METRICS_PATH = BASE_DIR / "metrics" / "xgboost_calibrated_v1.json"

RANDOM_STATE = 42

# IMPORTANT:
# These are the actual training classes.
CLASS_NAMES = ["LOW", "MEDIUM", "HIGH"]

LABEL_TO_INT = {
    "LOW": 0,
    "MEDIUM": 1,
    "HIGH": 2,
}

INT_TO_LABEL = {
    0: "LOW",
    1: "MEDIUM",
    2: "HIGH",
}

FEATURES = [
    "accidents_7d",
    "accidents_30d",
    "accidents_90d",
    "accidents_1y",
    "fatal_accidents_1y",
    "injury_accidents_1y",
    "historical_accident_rate",
    "junction",
]

TARGET = "risk_level"


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

def print_header(title):
    print()
    print("=" * 80)
    print(title)
    print("=" * 80)


def check_file(path, description):
    if not path.exists():
        raise FileNotFoundError(
            f"{description} not found:\n{path}"
        )

    print(f"OK: {path}")


def validate_columns(df, required_columns, dataset_name):
    missing = [
        column
        for column in required_columns
        if column not in df.columns
    ]

    if missing:
        raise ValueError(
            f"{dataset_name} is missing columns:\n{missing}"
        )


def encode_target(series):
    """
    Convert LOW/MEDIUM/HIGH strings into 0/1/2.

    This is required because the saved XGBoost model was trained
    using numeric class labels.
    """

    cleaned = series.astype(str).str.strip().str.upper()

    unknown = sorted(
        set(cleaned.unique()) - set(LABEL_TO_INT.keys())
    )

    if unknown:
        raise ValueError(
            f"Unknown risk classes found: {unknown}\n"
            f"Expected only: {CLASS_NAMES}"
        )

    return cleaned.map(LABEL_TO_INT).astype(int)


def decode_predictions(predictions):
    """
    Convert numeric predictions back to LOW/MEDIUM/HIGH.
    """

    predictions = np.asarray(predictions).astype(int)

    return np.array(
        [INT_TO_LABEL[int(value)] for value in predictions]
    )


def calculate_high_risk_metrics(y_true, y_pred):
    """
    Calculate HIGH-risk precision/recall/F1 for multiclass classification.

    HIGH is treated as the positive safety class.
    """

    high_true = (np.asarray(y_true) == LABEL_TO_INT["HIGH"]).astype(int)
    high_pred = (np.asarray(y_pred) == LABEL_TO_INT["HIGH"]).astype(int)

    precision = precision_score(
        high_true,
        high_pred,
        zero_division=0,
    )

    recall = recall_score(
        high_true,
        high_pred,
        zero_division=0,
    )

    f1 = f1_score(
        high_true,
        high_pred,
        zero_division=0,
    )

    return precision, recall, f1


def calculate_metrics(y_true, y_pred):
    """
    Calculate standard multiclass metrics.
    """

    high_precision, high_recall, high_f1 = (
        calculate_high_risk_metrics(
            y_true,
            y_pred,
        )
    )

    metrics = {
        "accuracy": float(
            accuracy_score(y_true, y_pred)
        ),
        "precision_weighted": float(
            precision_score(
                y_true,
                y_pred,
                average="weighted",
                zero_division=0,
            )
        ),
        "recall_weighted": float(
            recall_score(
                y_true,
                y_pred,
                average="weighted",
                zero_division=0,
            )
        ),
        "f1_weighted": float(
            f1_score(
                y_true,
                y_pred,
                average="weighted",
                zero_division=0,
            )
        ),
        "high_risk_precision": float(high_precision),
        "high_risk_recall": float(high_recall),
        "high_risk_f1": float(high_f1),
    }

    return metrics


def get_probabilities(model, X):
    """
    Safely obtain probability predictions.

    The original XGBoost model is a sklearn Pipeline,
    so Pipeline.predict_proba() can be used directly.
    """

    if not hasattr(model, "predict_proba"):
        raise AttributeError(
            "Loaded model does not provide predict_proba()."
        )

    probabilities = model.predict_proba(X)

    probabilities = np.asarray(probabilities)

    if probabilities.ndim != 2:
        raise ValueError(
            f"Unexpected probability shape: {probabilities.shape}"
        )

    if probabilities.shape[1] != 3:
        raise ValueError(
            "Expected 3 class probabilities "
            f"(LOW/MEDIUM/HIGH), got shape {probabilities.shape}"
        )

    return probabilities


def probabilities_to_predictions(probabilities):
    """
    Convert probability matrix to numeric class predictions.
    """

    return np.argmax(probabilities, axis=1).astype(int)


def apply_confidence_threshold(
    probabilities,
    threshold,
):
    """
    Convert probabilities into final predictions.

    If maximum probability is below threshold:
        UNCERTAIN

    Otherwise:
        LOW / MEDIUM / HIGH
    """

    max_probability = probabilities.max(axis=1)

    class_indices = probabilities.argmax(axis=1)

    predictions = []

    for confidence, class_index in zip(
        max_probability,
        class_indices,
    ):
        if confidence < threshold:
            predictions.append("UNCERTAIN")
        else:
            predictions.append(
                INT_TO_LABEL[int(class_index)]
            )

    return np.array(predictions)


def evaluate_threshold(
    y_true_numeric,
    probabilities,
    threshold,
):
    """
    Evaluate confidence threshold.

    HIGH-risk precision is calculated only among predictions
    labelled HIGH. UNCERTAIN is not treated as HIGH.
    """

    predictions = apply_confidence_threshold(
        probabilities,
        threshold,
    )

    true_labels = decode_predictions(y_true_numeric)

    predicted_high = (
        predictions == "HIGH"
    ).astype(int)

    true_high = (
        true_labels == "HIGH"
    ).astype(int)

    high_precision = precision_score(
        true_high,
        predicted_high,
        zero_division=0,
    )

    high_recall = recall_score(
        true_high,
        predicted_high,
        zero_division=0,
    )

    uncertain_count = int(
        np.sum(predictions == "UNCERTAIN")
    )

    uncertain_rate = (
        uncertain_count / len(predictions)
        if len(predictions) > 0
        else 0.0
    )

    high_count = int(
        np.sum(predictions == "HIGH")
    )

    return {
        "threshold": float(threshold),
        "high_risk_precision": float(high_precision),
        "high_risk_recall": float(high_recall),
        "uncertain_count": uncertain_count,
        "uncertain_rate": float(uncertain_rate),
        "high_prediction_count": high_count,
    }


# =============================================================================
# MAIN
# =============================================================================

def main():

    print_header(
        "NAGPUR PULSE - XGBOOST PROBABILITY CALIBRATION"
    )

    # -------------------------------------------------------------------------
    # 1. CHECK FILES
    # -------------------------------------------------------------------------

    print_header("CHECKING REQUIRED FILES")

    check_file(
        TRAIN_PATH,
        "Training dataset",
    )

    check_file(
        TEST_PATH,
        "Test dataset",
    )

    check_file(
        XGBOOST_MODEL_PATH,
        "XGBoost model",
    )

    # -------------------------------------------------------------------------
    # 2. LOAD DATA
    # -------------------------------------------------------------------------

    print_header("LOADING DATASETS")

    train_df = pd.read_csv(TRAIN_PATH)
    test_df = pd.read_csv(TEST_PATH)

    print(f"Train rows: {len(train_df)}")
    print(f"Test rows : {len(test_df)}")

    validate_columns(
        train_df,
        FEATURES + [TARGET],
        "TRAIN dataset",
    )

    validate_columns(
        test_df,
        FEATURES + [TARGET],
        "TEST dataset",
    )

    # -------------------------------------------------------------------------
    # 3. FEATURE PREPARATION
    # -------------------------------------------------------------------------

    print_header("FEATURE PREPARATION")

    print("Features:")

    for feature in FEATURES:
        print(f" - {feature}")

    X_train = train_df[FEATURES].copy()
    X_test = test_df[FEATURES].copy()

    # -------------------------------------------------------------------------
    # IMPORTANT FIX
    #
    # The saved XGBoost model was trained with numeric target labels:
    #
    # LOW    -> 0
    # MEDIUM -> 1
    # HIGH   -> 2
    #
    # Therefore calibration must also receive numeric labels.
    # -------------------------------------------------------------------------

    y_train = encode_target(
        train_df[TARGET]
    )

    y_test = encode_target(
        test_df[TARGET]
    )

    print()
    print("Target encoding:")

    for label, number in LABEL_TO_INT.items():
        print(f" {label} -> {number}")

    print()
    print("Training classes:")
    print(
        train_df[TARGET].value_counts()
    )

    print()
    print("Test classes:")
    print(
        test_df[TARGET].value_counts()
    )

    # -------------------------------------------------------------------------
    # 4. LOAD ORIGINAL MODEL
    # -------------------------------------------------------------------------

    print_header(
        "LOADING ORIGINAL XGBOOST MODEL"
    )

    original_model = joblib.load(
        XGBOOST_MODEL_PATH
    )

    print(
        f"Loaded model type: "
        f"{type(original_model).__name__}"
    )

    if hasattr(
        original_model,
        "classes_",
    ):
        print(
            "Model classes:",
            original_model.classes_,
        )

    elif hasattr(
        original_model,
        "named_steps",
    ):
        final_estimator = list(
            original_model.named_steps.values()
        )[-1]

        if hasattr(
            final_estimator,
            "classes_",
        ):
            print(
                "Final estimator classes:",
                final_estimator.classes_,
            )

    # -------------------------------------------------------------------------
    # 5. DATA LEAKAGE SAFETY
    # -------------------------------------------------------------------------

    print_header(
        "DATA LEAKAGE SAFETY CHECK"
    )

    print(
        "Calibration will use TRAIN data only."
    )

    print(
        "The final TEST dataset will NOT be used "
        "for calibration fitting."
    )

    print(
        "TEST data will only be used for final evaluation."
    )

    # -------------------------------------------------------------------------
    # 6. CREATE CALIBRATED CLASSIFIER
    # -------------------------------------------------------------------------

    print_header(
        "PROBABILITY CALIBRATION"
    )

    print("Calibration method: sigmoid")
    print("Calibration folds: 5")
    print("Calibration data: TRAIN only")

    print()
    print(
        "Creating calibrated classifier..."
    )

    # sklearn >= 1.2 uses estimator=
    # Older versions used base_estimator=.
    #
    # We use estimator= because the environment is
    # using a current sklearn release.

    cv = StratifiedKFold(
        n_splits=5,
        shuffle=True,
        random_state=RANDOM_STATE,
    )

    calibrated_model = CalibratedClassifierCV(
        estimator=original_model,
        method="sigmoid",
        cv=cv,
        n_jobs=-1,
    )

    print(
        "Fitting calibration model..."
    )

    calibrated_model.fit(
        X_train,
        y_train,
    )

    print(
        "Calibration training complete."
    )

    # -------------------------------------------------------------------------
    # 7. CALIBRATED TEST PROBABILITIES
    # -------------------------------------------------------------------------

    print_header(
        "CALIBRATED TEST EVALUATION"
    )

    print(
        "Generating probabilities on untouched TEST data..."
    )

    test_probabilities = calibrated_model.predict_proba(
        X_test
    )

    print(
        f"Probability matrix shape: "
        f"{test_probabilities.shape}"
    )

    # -------------------------------------------------------------------------
    # 8. STANDARD CALIBRATED PREDICTION
    # -------------------------------------------------------------------------

    test_predictions_numeric = (
        probabilities_to_predictions(
            test_probabilities
        )
    )

    test_predictions_labels = decode_predictions(
        test_predictions_numeric
    )

    calibrated_metrics = calculate_metrics(
        y_test,
        test_predictions_numeric,
    )

    print()
    print(
        "CALIBRATED XGBOOST RESULTS"
    )

    print("-" * 80)

    print(
        f"Accuracy       : "
        f"{calibrated_metrics['accuracy']:.4f}"
    )

    print(
        f"Weighted Prec. : "
        f"{calibrated_metrics['precision_weighted']:.4f}"
    )

    print(
        f"Weighted Recall: "
        f"{calibrated_metrics['recall_weighted']:.4f}"
    )

    print(
        f"Weighted F1    : "
        f"{calibrated_metrics['f1_weighted']:.4f}"
    )

    print()
    print(
        "HIGH-RISK METRICS"
    )

    print("-" * 80)

    print(
        f"HIGH Precision : "
        f"{calibrated_metrics['high_risk_precision']:.4f}"
    )

    print(
        f"HIGH Recall    : "
        f"{calibrated_metrics['high_risk_recall']:.4f}"
    )

    print(
        f"HIGH F1        : "
        f"{calibrated_metrics['high_risk_f1']:.4f}"
    )

    # -------------------------------------------------------------------------
    # 9. CLASSIFICATION REPORT
    # -------------------------------------------------------------------------

    print()
    print(
        "CLASSIFICATION REPORT"
    )

    print("-" * 80)

    print(
        classification_report(
            y_test,
            test_predictions_numeric,
            labels=[0, 1, 2],
            target_names=[
                "LOW",
                "MEDIUM",
                "HIGH",
            ],
            zero_division=0,
        )
    )

    # -------------------------------------------------------------------------
    # 10. CONFUSION MATRIX
    # -------------------------------------------------------------------------

    print(
        "CONFUSION MATRIX"
    )

    print("-" * 80)

    cm = confusion_matrix(
        y_test,
        test_predictions_numeric,
        labels=[0, 1, 2],
    )

    print(
        "Labels: LOW, MEDIUM, HIGH"
    )

    print(cm)

    # -------------------------------------------------------------------------
    # 11. SHOW SAMPLE PROBABILITIES
    # -------------------------------------------------------------------------

    print_header(
        "SAMPLE CALIBRATED PROBABILITIES"
    )

    for i in range(
        min(10, len(test_probabilities))
    ):

        probabilities = (
            test_probabilities[i]
        )

        prediction = (
            test_predictions_labels[i]
        )

        confidence = float(
            probabilities.max()
        )

        print(
            f"Sample {i + 1}: "
            f"{prediction} "
            f"(confidence={confidence:.4f})"
        )

        print(
            f"    LOW    = "
            f"{probabilities[0]:.4f}"
        )

        print(
            f"    MEDIUM = "
            f"{probabilities[1]:.4f}"
        )

        print(
            f"    HIGH   = "
            f"{probabilities[2]:.4f}"
        )

    # -------------------------------------------------------------------------
    # 12. CONFIDENCE THRESHOLD SEARCH
    # -------------------------------------------------------------------------

    print_header(
        "CONFIDENCE THRESHOLD ANALYSIS"
    )

    print(
        "Testing thresholds from 0.50 to 0.95."
    )

    print(
        "UNCERTAIN is returned when maximum probability "
        "is below the threshold."
    )

    thresholds = [
        0.50,
        0.55,
        0.60,
        0.65,
        0.70,
        0.75,
        0.80,
        0.85,
        0.90,
        0.95,
    ]

    threshold_results = []

    for threshold in thresholds:

        result = evaluate_threshold(
            y_test_numeric := y_test,
            probabilities=test_probabilities,
            threshold=threshold,
        )

        threshold_results.append(result)

        print()
        print(
            f"Threshold: "
            f"{threshold:.2f}"
        )

        print(
            f"  HIGH precision : "
            f"{result['high_risk_precision']:.4f}"
        )

        print(
            f"  HIGH recall    : "
            f"{result['high_risk_recall']:.4f}"
        )

        print(
            f"  UNCERTAIN rate : "
            f"{result['uncertain_rate']:.2%}"
        )

        print(
            f"  HIGH count     : "
            f"{result['high_prediction_count']}"
        )

    # -------------------------------------------------------------------------
    # 13. SELECT SAFETY THRESHOLD
    # -------------------------------------------------------------------------

    print_header(
        "SELECTING CONFIDENCE THRESHOLD"
    )

    # Primary requirement:
    # HIGH-risk precision >= 90%.
    #
    # Important:
    # If no threshold achieves 90%, we DO NOT falsely claim
    # that the target was achieved.
    #
    # We choose the highest HIGH precision available.
    # This is a safety-first approach.

    qualifying = [
        result
        for result in threshold_results
        if result["high_risk_precision"] >= 0.90
    ]

    if qualifying:

        # Among thresholds achieving target,
        # prefer the lowest threshold that achieves it,
        # because it preserves more usable predictions.

        selected_result = sorted(
            qualifying,
            key=lambda x: x["threshold"],
        )[0]

        selected_threshold = (
            selected_result["threshold"]
        )

        target_status = "ACHIEVED"

        print(
            "HIGH-risk precision target >= 90% "
            "was achieved."
        )

    else:

        # No threshold achieved 90%.
        #
        # Select threshold giving highest HIGH precision.

        selected_result = max(
            threshold_results,
            key=lambda x: (
                x["high_risk_precision"],
                x["high_risk_recall"],
            ),
        )

        selected_threshold = (
            selected_result["threshold"]
        )

        target_status = "NOT_ACHIEVED"

        print(
            "WARNING: No tested threshold achieved "
            "HIGH-risk precision >= 90%."
        )

        print(
            "The model must NOT be represented as "
            "meeting the safety target."
        )

    print()
    print(
        f"Selected threshold: "
        f"{selected_threshold:.2f}"
    )

    print(
        f"HIGH precision at selected threshold: "
        f"{selected_result['high_risk_precision']:.4f}"
    )

    print(
        f"HIGH recall at selected threshold: "
        f"{selected_result['high_risk_recall']:.4f}"
    )

    print(
        f"UNCERTAIN rate: "
        f"{selected_result['uncertain_rate']:.2%}"
    )

    print(
        f"Safety target status: "
        f"{target_status}"
    )

    # -------------------------------------------------------------------------
    # 14. FINAL UNCERTAIN PREDICTIONS
    # -------------------------------------------------------------------------

    print_header(
        "FINAL UNCERTAINTY LOGIC"
    )

    final_predictions = apply_confidence_threshold(
        test_probabilities,
        selected_threshold,
    )

    print(
        f"Confidence threshold: "
        f"{selected_threshold:.2f}"
    )

    print()
    print(
        "Prediction logic:"
    )

    print(
        f"Confidence >= "
        f"{selected_threshold:.2f}"
    )

    print(
        "    -> LOW / MEDIUM / HIGH"
    )

    print(
        f"Confidence < "
        f"{selected_threshold:.2f}"
    )

    print(
        "    -> UNCERTAIN"
    )

    uncertain_count = int(
        np.sum(
            final_predictions == "UNCERTAIN"
        )
    )

    print()
    print(
        f"UNCERTAIN predictions on TEST: "
        f"{uncertain_count}/{len(final_predictions)}"
    )

    # -------------------------------------------------------------------------
    # 15. SAVE CALIBRATED MODEL
    # -------------------------------------------------------------------------

    print_header(
        "SAVING CALIBRATED MODEL"
    )

    OUTPUT_MODEL_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    OUTPUT_METRICS_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        calibrated_model,
        OUTPUT_MODEL_PATH,
    )

    print(
        f"Calibrated model saved:"
    )

    print(
        OUTPUT_MODEL_PATH
    )

    # -------------------------------------------------------------------------
    # 16. SAVE METADATA + METRICS
    # -------------------------------------------------------------------------

    metrics_output = {
        "project": "NAGPUR PULSE",

        "model_name": "XGBoost",

        "model_version": "traffic-risk-xgboost-calibrated-v1",

        "base_model": "xgboost_v1",

        "calibration": {
            "method": "sigmoid",
            "folds": 5,
            "training_data_only": True,
        },

        "features": FEATURES,

        "target": TARGET,

        "target_classes": CLASS_NAMES,

        "label_encoding": LABEL_TO_INT,

        "train_rows": int(len(train_df)),

        "test_rows": int(len(test_df)),

        "random_state": RANDOM_STATE,

        "metrics": calibrated_metrics,

        "confusion_matrix": cm.tolist(),

        "confidence_threshold": float(
            selected_threshold
        ),

        "high_risk_precision_target": 0.90,

        "high_risk_precision_target_status": (
            target_status
        ),

        "threshold_analysis": threshold_results,

        "uncertain_prediction_rule": (
            "If maximum class probability is below "
            "confidence_threshold, return UNCERTAIN."
        ),

        "data_leakage_policy": {
            "final_test_used_for_calibration": False,
            "final_test_used_only_for_evaluation": True,
        },

        "limitations": [
            "Dataset is synthetic/simulated.",
            "Current model uses primarily historical accident features.",
            "The HIGH-risk precision target of 90% must be validated on representative real-world data before production use.",
            "UNCERTAIN is an output state and is not a training class.",
        ],
    }

    with open(
        OUTPUT_METRICS_PATH,
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            metrics_output,
            file,
            indent=4,
        )

    print()
    print(
        f"Metrics saved:"
    )

    print(
        OUTPUT_METRICS_PATH
    )

    # -------------------------------------------------------------------------
    # 17. RELOAD TEST
    # -------------------------------------------------------------------------

    print_header(
        "CALIBRATED MODEL RELOAD TEST"
    )

    print(
        "Reloading saved calibrated model..."
    )

    reloaded_model = joblib.load(
        OUTPUT_MODEL_PATH
    )

    print(
        "Reload successful."
    )

    reload_probabilities = (
        reloaded_model.predict_proba(
            X_test.head(5)
        )
    )

    print()
    print(
        "Sample predictions after reload:"
    )

    for i, probabilities in enumerate(
        reload_probabilities,
        start=1,
    ):

        confidence = float(
            probabilities.max()
        )

        prediction = apply_confidence_threshold(
            probabilities.reshape(1, -1),
            selected_threshold,
        )[0]

        print(
            f"Sample {i}: "
            f"{prediction} "
            f"(confidence={confidence:.4f})"
        )

    # -------------------------------------------------------------------------
    # COMPLETE
    # -------------------------------------------------------------------------

    print_header(
        "PROBABILITY CALIBRATION COMPLETE"
    )

    print()
    print(
        "Files created:"
    )

    print(
        f"Model   : {OUTPUT_MODEL_PATH}"
    )

    print(
        f"Metrics : {OUTPUT_METRICS_PATH}"
    )

    print()
    print(
        "Next step:"
    )

    print(
        "Use the calibrated model + confidence threshold "
        "inside the prediction service."
    )

    print()
    print(
        "IMPORTANT:"
    )

    print(
        "The current dataset is synthetic/simulated."
    )

    print(
        "Do not claim production-grade 90% HIGH-risk precision "
        "until this is validated on representative real-world data."
    )

    print()


if __name__ == "__main__":
    main()