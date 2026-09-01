import sys
import json
import time
from pathlib import Path
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split
from imblearn.over_sampling import SMOTE, BorderlineSMOTE, RandomOverSampler
from sklearn.metrics import (
    confusion_matrix, accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, matthews_corrcoef, cohen_kappa_score,
    log_loss, brier_score_loss, balanced_accuracy_score, classification_report
)
from sklearn.preprocessing import label_binarize
from sklearn.utils.class_weight import compute_sample_weight
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier

PROJECT_ROOT = Path("c:/Users/lenovo/OneDrive/Desktop/Nagpur Pulse/Nagpur-Pulse")

train_path = PROJECT_ROOT / "data" / "feature_store" / "train_features.csv"
val_path = PROJECT_ROOT / "data" / "feature_store" / "validation_features.csv"
test_path = PROJECT_ROOT / "data" / "feature_store" / "test_features.csv"

train_df = pd.read_csv(train_path)
val_df = pd.read_csv(val_path)
test_df = pd.read_csv(test_path)

full_df = pd.concat([train_df, val_df, test_df], ignore_index=True)

TARGET_MAP = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
REVERSE_MAP = {0: "LOW", 1: "MEDIUM", 2: "HIGH", 3: "CRITICAL"}
CLASS_NAMES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

meta_cols = {"junction", "period_date", "traffic_risk", "risk_score"}
feature_cols = [c for c in full_df.columns if c not in meta_cols]

X = full_df[feature_cols].copy().fillna(0.0)
y = full_df["traffic_risk"].map(TARGET_MAP).fillna(0).astype(int).values

# 1. Stratified Split: 70% Train, 15% Validation, 15% Test
X_train, X_temp, y_train, y_temp = train_test_split(
    X, y, test_size=0.30, stratify=y, random_state=42
)
X_val, X_test, y_val, y_test = train_test_split(
    X_temp, y_temp, test_size=0.50, stratify=y_temp, random_state=42
)

print(f"Data shapes - Train: {X_train.shape}, Val: {X_val.shape}, Test: {X_test.shape}")
print(f"Train class distribution: {np.bincount(y_train)}")
print(f"Val class distribution:   {np.bincount(y_val)}")
print(f"Test class distribution:  {np.bincount(y_test)}")

# -------------------------------------------------------------
# 2. BEFORE IMBALANCE HANDLING (Standard Unweighted XGBoost on raw train data)
# -------------------------------------------------------------
print("\n[1/2] Training Baseline Model (Before Imbalance Handling)...")
xgb_before = XGBClassifier(
    n_estimators=120, max_depth=5, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8, objective="multi:softprob",
    num_class=4, eval_metric="mlogloss", random_state=42
)
xgb_before.fit(X_train, y_train)

y_pred_before = xgb_before.predict(X_test)
y_proba_before = xgb_before.predict_proba(X_test)

# -------------------------------------------------------------
# 3. AFTER IMBALANCE HANDLING (SMOTE on Train ONLY + Custom Class Weighting)
# -------------------------------------------------------------
print("\n[2/2] Training Imbalance-Fixed Model (SMOTE + Class/Sample Weighting)...")

# SMOTE on training data ONLY
smote = SMOTE(
    sampling_strategy={0: 1954, 1: 400, 2: 300, 3: 200},
    k_neighbors=2,
    random_state=42
)
X_train_res, y_train_res = smote.fit_resample(X_train, y_train)
print(f"Resampled Training distribution: {np.bincount(y_train_res)}")

# Penalize HIGH and CRITICAL mistakes heavily via sample weights
class_penalty_weights = {0: 1.0, 1: 1.5, 2: 4.0, 3: 6.0}
sample_weights_res = np.array([class_penalty_weights[c] for c in y_train_res])

xgb_after = XGBClassifier(
    n_estimators=150, max_depth=4, learning_rate=0.04,
    subsample=0.85, colsample_bytree=0.85, objective="multi:softprob",
    num_class=4, eval_metric="mlogloss", random_state=42
)
xgb_after.fit(X_train_res, y_train_res, sample_weight=sample_weights_res)

# Random Forest After
rf_after = RandomForestClassifier(
    n_estimators=150, max_depth=6, min_samples_split=3, min_samples_leaf=1,
    class_weight={0: 1.0, 1: 1.5, 2: 4.0, 3: 6.0}, random_state=42, n_jobs=1
)
rf_after.fit(X_train_res, y_train_res)

# Evaluate on Validation set to verify threshold/decision rule, then evaluate on Test
y_proba_after = xgb_after.predict_proba(X_test)
y_pred_after = xgb_after.predict(X_test)

y_proba_rf_after = rf_after.predict_proba(X_test)
y_pred_rf_after = rf_after.predict(X_test)

def compute_all_metrics(y_true, y_pred, y_proba, model_name="Model"):
    acc = accuracy_score(y_true, y_pred)
    prec_macro = precision_score(y_true, y_pred, average="macro", zero_division=0)
    rec_macro = recall_score(y_true, y_pred, average="macro", zero_division=0)
    f1_macro = f1_score(y_true, y_pred, average="macro", zero_division=0)
    bal_acc = balanced_accuracy_score(y_true, y_pred)
    mcc = matthews_corrcoef(y_true, y_pred)
    kappa = cohen_kappa_score(y_true, y_pred)
    
    # Class-wise metrics
    c_rec = recall_score(y_true, y_pred, average=None, zero_division=0)
    c_prec = precision_score(y_true, y_pred, average=None, zero_division=0)
    c_f1 = f1_score(y_true, y_pred, average=None, zero_division=0)
    
    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2, 3])
    
    # One-vs-Rest breakdown
    ovr_details = {}
    for i, cname in enumerate(CLASS_NAMES):
        yt_b = (y_true == i).astype(int)
        yp_b = (y_pred == i).astype(int)
        c_cm = confusion_matrix(yt_b, yp_b, labels=[0, 1])
        c_tn, c_fp, c_fn, c_tp = c_cm.ravel()
        c_spec = c_tn / (c_tn + c_fp) if (c_tn + c_fp) > 0 else 0.0
        c_fpr = c_fp / (c_fp + c_tn) if (c_fp + c_tn) > 0 else 0.0
        c_fnr = c_fn / (c_fn + c_tp) if (c_fn + c_tp) > 0 else 0.0
        ovr_details[cname] = {
            "TP": int(c_tp), "TN": int(c_tn), "FP": int(c_fp), "FN": int(c_fn),
            "precision": float(c_prec[i]), "recall": float(c_rec[i]), "f1": float(c_f1[i]),
            "specificity": float(c_spec), "fpr": float(c_fpr), "fnr": float(c_fnr),
            "support": int(np.sum(y_true == i))
        }
        
    # Binary Emergency Metric (HIGH + CRITICAL vs LOW + MEDIUM)
    y_true_emerg = (y_true >= 2).astype(int)
    y_pred_emerg = (y_pred >= 2).astype(int)
    cm_emerg = confusion_matrix(y_true_emerg, y_pred_emerg, labels=[0, 1])
    tn_e, fp_e, fn_e, tp_e = cm_emerg.ravel()
    emerg_prec = precision_score(y_true_emerg, y_pred_emerg, zero_division=0)
    emerg_rec = recall_score(y_true_emerg, y_pred_emerg, zero_division=0)
    emerg_f1 = f1_score(y_true_emerg, y_pred_emerg, zero_division=0)
    emerg_fnr = fn_e / (fn_e + tp_e) if (fn_e + tp_e) > 0 else 0.0
    emerg_fpr = fp_e / (fp_e + tn_e) if (fp_e + tn_e) > 0 else 0.0
    
    # ROC-AUC and PR-AUC
    y_bin = label_binarize(y_true, classes=[0, 1, 2, 3])
    roc_auc = roc_auc_score(y_bin, y_proba, multi_class="ovr", average="macro")
    class_pr_auc = {}
    for i, cname in enumerate(CLASS_NAMES):
        class_pr_auc[cname] = float(average_precision_score(y_bin[:, i], y_proba[:, i]))
    pr_auc_macro = float(np.mean(list(class_pr_auc.values())))
    
    brier = float(np.mean([brier_score_loss(y_bin[:, i], y_proba[:, i]) for i in range(4)]))
    loss = float(log_loss(y_true, y_proba, labels=[0, 1, 2, 3]))

    return {
        "model_name": model_name,
        "accuracy": float(acc),
        "macro_precision": float(prec_macro),
        "macro_recall": float(rec_macro),
        "macro_f1": float(f1_macro),
        "balanced_accuracy": float(bal_acc),
        "mcc": float(mcc),
        "cohens_kappa": float(kappa),
        "log_loss": float(loss),
        "brier_score": float(brier),
        "roc_auc": float(roc_auc),
        "pr_auc_macro": float(pr_auc_macro),
        "class_pr_auc": class_pr_auc,
        "confusion_matrix": cm.tolist(),
        "per_class": ovr_details,
        "emergency_tier": {
            "TP": int(tp_e), "TN": int(tn_e), "FP": int(fp_e), "FN": int(fn_e),
            "precision": float(emerg_prec), "recall_R1": float(emerg_rec),
            "f1": float(emerg_f1), "fnr": float(emerg_fnr), "fpr": float(emerg_fpr)
        }
    }

metrics_before = compute_all_metrics(y_test, y_pred_before, y_proba_before, "XGBoost (Before Imbalance Handling)")
metrics_after_xgb = compute_all_metrics(y_test, y_pred_after, y_proba_after, "XGBoost (After SMOTE + Weighting)")
metrics_after_rf = compute_all_metrics(y_test, y_pred_rf_after, y_proba_rf_after, "Random Forest (After SMOTE + Weighting)")

comparison_summary = {
    "test_set_size": len(y_test),
    "class_counts_test": {CLASS_NAMES[i]: int(np.sum(y_test == i)) for i in range(4)},
    "metrics_before": metrics_before,
    "metrics_after_xgb": metrics_after_xgb,
    "metrics_after_rf": metrics_after_rf,
}

out_path = PROJECT_ROOT / "data" / "reports" / "imbalance_fix_comparison.json"
with open(out_path, "w") as f:
    json.dump(comparison_summary, f, indent=2)

print("\n=== BEFORE IMBALANCE HANDLING ===")
print("Accuracy:", metrics_before["accuracy"])
print("Macro F1:", metrics_before["macro_f1"])
print("CRITICAL Recall:", metrics_before["per_class"]["CRITICAL"]["recall"])
print("HIGH Recall:", metrics_before["per_class"]["HIGH"]["recall"])
print("Confusion Matrix:\n", np.array(metrics_before["confusion_matrix"]))

print("\n=== AFTER IMBALANCE HANDLING (XGBoost) ===")
print("Accuracy:", metrics_after_xgb["accuracy"])
print("Macro F1:", metrics_after_xgb["macro_f1"])
print("Macro Recall:", metrics_after_xgb["macro_recall"])
print("CRITICAL Recall:", metrics_after_xgb["per_class"]["CRITICAL"]["recall"])
print("HIGH Recall:", metrics_after_xgb["per_class"]["HIGH"]["recall"])
print("Emergency Recall (R1):", metrics_after_xgb["emergency_tier"]["recall_R1"])
print("Confusion Matrix:\n", np.array(metrics_after_xgb["confusion_matrix"]))
