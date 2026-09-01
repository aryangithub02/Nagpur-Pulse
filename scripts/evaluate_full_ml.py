import sys
import json
import numpy as np
import pandas as pd
from pathlib import Path
import joblib

from sklearn.metrics import (
    confusion_matrix, accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, matthews_corrcoef, cohen_kappa_score,
    log_loss, brier_score_loss, balanced_accuracy_score, classification_report
)
from sklearn.preprocessing import label_binarize
from sklearn.model_selection import StratifiedKFold
from xgboost import XGBClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.dummy import DummyClassifier
from sklearn.utils.class_weight import compute_sample_weight

PROJECT_ROOT = Path("c:/Users/lenovo/OneDrive/Desktop/Nagpur Pulse/Nagpur-Pulse")
train_path = PROJECT_ROOT / "data" / "feature_store" / "train_features.csv"
val_path = PROJECT_ROOT / "data" / "feature_store" / "validation_features.csv"
test_path = PROJECT_ROOT / "data" / "feature_store" / "test_features.csv"

train_df = pd.read_csv(train_path)
val_df = pd.read_csv(val_path)
test_df = pd.read_csv(test_path)

TARGET_MAP = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}
REVERSE_MAP = {0: "LOW", 1: "MEDIUM", 2: "HIGH", 3: "CRITICAL"}
CLASS_NAMES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

meta_cols = {"junction", "period_date", "traffic_risk", "risk_score"}
feature_cols = [c for c in train_df.columns if c not in meta_cols]

X_train = train_df[feature_cols].copy().fillna(0.0)
y_train = train_df["traffic_risk"].map(TARGET_MAP).fillna(0).astype(int).values

X_val = val_df[feature_cols].copy().fillna(0.0)
y_val = val_df["traffic_risk"].map(TARGET_MAP).fillna(0).astype(int).values

X_test = test_df[feature_cols].copy().fillna(0.0)
y_test = test_df["traffic_risk"].map(TARGET_MAP).fillna(0).astype(int).values

# Load existing models or train fresh to guarantee reproducibility
rf_model = RandomForestClassifier(
    n_estimators=150, max_depth=8, min_samples_split=4, min_samples_leaf=2,
    max_features="sqrt", class_weight="balanced", random_state=42, n_jobs=1
)
rf_model.fit(X_train, y_train)

sample_weights = compute_sample_weight(class_weight="balanced", y=y_train)
xgb_model = XGBClassifier(
    n_estimators=120, max_depth=5, learning_rate=0.05, subsample=0.8,
    colsample_bytree=0.8, objective="multi:softprob", num_class=4,
    eval_metric="mlogloss", random_state=42
)
xgb_model.fit(X_train, y_train, sample_weight=sample_weights)

lr_model = LogisticRegression(max_iter=1000, class_weight="balanced", random_state=42)
lr_model.fit(X_train, y_train)

dummy_model = DummyClassifier(strategy="most_frequent")
dummy_model.fit(X_train, y_train)

models = {
    "XGBoost": xgb_model,
    "Random Forest": rf_model,
    "Logistic Regression": lr_model,
    "Dummy Baseline": dummy_model
}

results = {}

for name, model in models.items():
    # Predictions
    y_train_pred = model.predict(X_train)
    y_val_pred = model.predict(X_val)
    y_test_pred = model.predict(X_test)
    
    y_test_proba = model.predict_proba(X_test) if hasattr(model, "predict_proba") else None
    y_train_proba = model.predict_proba(X_train) if hasattr(model, "predict_proba") else None
    y_val_proba = model.predict_proba(X_val) if hasattr(model, "predict_proba") else None
    
    y_test_bin = label_binarize(y_test, classes=[0, 1, 2, 3])
    
    # Multiclass confusion matrix
    cm = confusion_matrix(y_test, y_test_pred, labels=[0, 1, 2, 3])
    
    # Binary classification view: High Risk (HIGH + CRITICAL = positive) vs Normal/Low Risk (LOW + MEDIUM = negative)
    y_test_binary = (y_test >= 2).astype(int)
    y_test_pred_binary = (y_test_pred >= 2).astype(int)
    cm_binary = confusion_matrix(y_test_binary, y_test_pred_binary, labels=[0, 1])
    tn_bin, fp_bin, fn_bin, tp_bin = cm_binary.ravel()
    
    # Per-class One-vs-Rest TP, TN, FP, FN
    per_class_ovr = {}
    for i, cname in enumerate(CLASS_NAMES):
        y_c_true = (y_test == i).astype(int)
        y_c_pred = (y_test_pred == i).astype(int)
        c_cm = confusion_matrix(y_c_true, y_c_pred, labels=[0, 1])
        c_tn, c_fp, c_fn, c_tp = c_cm.ravel()
        c_prec = precision_score(y_c_true, y_c_pred, zero_division=0)
        c_rec = recall_score(y_c_true, y_c_pred, zero_division=0)
        c_f1 = f1_score(y_c_true, y_c_pred, zero_division=0)
        c_spec = c_tn / (c_tn + c_fp) if (c_tn + c_fp) > 0 else 0
        c_fpr = c_fp / (c_fp + c_tn) if (c_fp + c_tn) > 0 else 0
        c_fnr = c_fn / (c_fn + c_tp) if (c_fn + c_tp) > 0 else 0
        per_class_ovr[cname] = {
            "TP": int(c_tp), "TN": int(c_tn), "FP": int(c_fp), "FN": int(c_fn),
            "precision": float(c_prec), "recall": float(c_rec), "f1": float(c_f1),
            "specificity": float(c_spec), "fpr": float(c_fpr), "fnr": float(c_fnr),
            "support": int(np.sum(y_test == i))
        }

    # Accuracy
    acc = accuracy_score(y_test, y_test_pred)
    train_acc = accuracy_score(y_train, y_train_pred)
    val_acc = accuracy_score(y_val, y_val_pred)
    
    # Precision
    prec_macro = precision_score(y_test, y_test_pred, average="macro", zero_division=0)
    prec_micro = precision_score(y_test, y_test_pred, average="micro", zero_division=0)
    prec_weighted = precision_score(y_test, y_test_pred, average="weighted", zero_division=0)
    
    # Recall
    rec_macro = recall_score(y_test, y_test_pred, average="macro", zero_division=0)
    rec_micro = recall_score(y_test, y_test_pred, average="micro", zero_division=0)
    rec_weighted = recall_score(y_test, y_test_pred, average="weighted", zero_division=0)
    
    # F1
    f1_macro = f1_score(y_test, y_test_pred, average="macro", zero_division=0)
    f1_micro = f1_score(y_test, y_test_pred, average="micro", zero_division=0)
    f1_weighted = f1_score(y_test, y_test_pred, average="weighted", zero_division=0)
    train_f1_macro = f1_score(y_train, y_train_pred, average="macro", zero_division=0)
    val_f1_macro = f1_score(y_val, y_val_pred, average="macro", zero_division=0)

    # Specificity, FPR, FNR for binary high-risk vs normal
    spec_bin = tn_bin / (tn_bin + fp_bin) if (tn_bin + fp_bin) > 0 else 0
    fpr_bin = fp_bin / (fp_bin + tn_bin) if (fp_bin + tn_bin) > 0 else 0
    fnr_bin = fn_bin / (fn_bin + tp_bin) if (fn_bin + tp_bin) > 0 else 0
    bal_acc = balanced_accuracy_score(y_test, y_test_pred)
    bal_acc_bin = (recall_score(y_test_binary, y_test_pred_binary, zero_division=0) + spec_bin) / 2
    
    # ROC-AUC & PR-AUC
    roc_auc_ovr = None
    pr_auc_macro = None
    class_pr_auc = {}
    class_roc_auc = {}
    if y_test_proba is not None:
        try:
            roc_auc_ovr = roc_auc_score(y_test_bin, y_test_proba, multi_class="ovr", average="macro")
        except:
            pass
        try:
            for i, cname in enumerate(CLASS_NAMES):
                if np.sum(y_test_bin[:, i]) > 0:
                    class_pr_auc[cname] = float(average_precision_score(y_test_bin[:, i], y_test_proba[:, i]))
                    class_roc_auc[cname] = float(roc_auc_score(y_test_bin[:, i], y_test_proba[:, i]))
                else:
                    class_pr_auc[cname] = 0.0
                    class_roc_auc[cname] = 0.0
            pr_auc_macro = float(np.mean(list(class_pr_auc.values())))
        except:
            pass
    
    # MCC
    mcc = matthews_corrcoef(y_test, y_test_pred)
    mcc_bin = matthews_corrcoef(y_test_binary, y_test_pred_binary)
    
    # Cohen's Kappa
    kappa = cohen_kappa_score(y_test, y_test_pred)
    
    # Log Loss & Brier Score
    loss_val = None
    brier_mean = None
    class_brier = {}
    if y_test_proba is not None:
        try:
            # avoid zero prob errors
            loss_val = float(log_loss(y_test, y_test_proba, labels=[0, 1, 2, 3]))
            for i, cname in enumerate(CLASS_NAMES):
                class_brier[cname] = float(brier_score_loss(y_test_bin[:, i], y_test_proba[:, i]))
            brier_mean = float(np.mean(list(class_brier.values())))
        except Exception as e:
            pass

    results[name] = {
        "confusion_matrix_multiclass": cm.tolist(),
        "confusion_matrix_binary": {
            "TP": int(tp_bin), "TN": int(tn_bin), "FP": int(fp_bin), "FN": int(fn_bin)
        },
        "per_class_ovr": per_class_ovr,
        "test_accuracy": float(acc),
        "train_accuracy": float(train_acc),
        "val_accuracy": float(val_acc),
        "macro_precision": float(prec_macro),
        "micro_precision": float(prec_micro),
        "weighted_precision": float(prec_weighted),
        "macro_recall": float(rec_macro),
        "micro_recall": float(rec_micro),
        "weighted_recall": float(rec_weighted),
        "macro_f1": float(f1_macro),
        "micro_f1": float(f1_micro),
        "weighted_f1": float(f1_weighted),
        "train_macro_f1": float(train_f1_macro),
        "val_macro_f1": float(val_f1_macro),
        "binary_metrics": {
            "precision": float(precision_score(y_test_binary, y_test_pred_binary, zero_division=0)),
            "recall_R1": float(recall_score(y_test_binary, y_test_pred_binary, zero_division=0)),
            "f1": float(f1_score(y_test_binary, y_test_pred_binary, zero_division=0)),
            "specificity": float(spec_bin),
            "fpr": float(fpr_bin),
            "fnr": float(fnr_bin),
            "balanced_accuracy": float(bal_acc_bin),
            "mcc": float(mcc_bin)
        },
        "multiclass_balanced_accuracy": float(bal_acc),
        "roc_auc_ovr": float(roc_auc_ovr) if roc_auc_ovr is not None else None,
        "pr_auc_macro": float(pr_auc_macro) if pr_auc_macro is not None else None,
        "class_pr_auc": class_pr_auc,
        "class_roc_auc": class_roc_auc,
        "mcc": float(mcc),
        "cohens_kappa": float(kappa),
        "log_loss": loss_val,
        "brier_score_mean": brier_mean,
        "class_brier": class_brier
    }

# Stratified K-Fold Cross Validation for XGBoost and Random Forest on full combined training+validation data
X_trainval = pd.concat([X_train, X_val], ignore_index=True)
y_trainval = np.concatenate([y_train, y_val])

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

cv_results = {}
for model_name, (model_cls, kwargs) in {
    "XGBoost": (XGBClassifier, {"n_estimators": 120, "max_depth": 5, "learning_rate": 0.05, "subsample": 0.8, "colsample_bytree": 0.8, "objective": "multi:softprob", "num_class": 4, "eval_metric": "mlogloss", "random_state": 42}),
    "Random Forest": (RandomForestClassifier, {"n_estimators": 150, "max_depth": 8, "min_samples_split": 4, "min_samples_leaf": 2, "max_features": "sqrt", "class_weight": "balanced", "random_state": 42, "n_jobs": 1})
}.items():
    fold_acc, fold_prec, fold_rec, fold_f1 = [], [], [], []
    for train_idx, test_idx in skf.split(X_trainval, y_trainval):
        X_tr, X_te = X_trainval.iloc[train_idx], X_trainval.iloc[test_idx]
        y_tr, y_te = y_trainval[train_idx], y_trainval[test_idx]
        
        if model_name == "XGBoost":
            sw = compute_sample_weight(class_weight="balanced", y=y_tr)
            m = model_cls(**kwargs)
            m.fit(X_tr, y_tr, sample_weight=sw)
        else:
            m = model_cls(**kwargs)
            m.fit(X_tr, y_tr)
            
        preds = m.predict(X_te)
        fold_acc.append(accuracy_score(y_te, preds))
        fold_prec.append(precision_score(y_te, preds, average="macro", zero_division=0))
        fold_rec.append(recall_score(y_te, preds, average="macro", zero_division=0))
        fold_f1.append(f1_score(y_te, preds, average="macro", zero_division=0))
        
    cv_results[model_name] = {
        "mean_accuracy": float(np.mean(fold_acc)),
        "std_accuracy": float(np.std(fold_acc)),
        "mean_precision": float(np.mean(fold_prec)),
        "std_precision": float(np.std(fold_prec)),
        "mean_recall": float(np.mean(fold_rec)),
        "std_recall": float(np.std(fold_rec)),
        "mean_f1": float(np.mean(fold_f1)),
        "std_f1": float(np.std(fold_f1)),
    }

# Error analysis details
xgb_preds = xgb_model.predict(X_test)
test_errors = []
for i in range(len(y_test)):
    act = CLASS_NAMES[y_test[i]]
    prd = CLASS_NAMES[xgb_preds[i]]
    if act != prd:
        test_errors.append({
            "index": i,
            "junction": test_df.iloc[i].get("junction", "Unknown"),
            "date": test_df.iloc[i].get("period_date", "Unknown"),
            "actual": act,
            "predicted": prd,
            "proba": xgb_model.predict_proba(X_test)[i].tolist()
        })

output_payload = {
    "test_set_size": len(y_test),
    "train_set_size": len(y_train),
    "val_set_size": len(y_val),
    "class_counts_test": {CLASS_NAMES[i]: int(np.sum(y_test == i)) for i in range(4)},
    "class_counts_train": {CLASS_NAMES[i]: int(np.sum(y_train == i)) for i in range(4)},
    "class_counts_val": {CLASS_NAMES[i]: int(np.sum(y_val == i)) for i in range(4)},
    "models": results,
    "cv_results": cv_results,
    "error_count_xgb": len(test_errors),
    "errors_sample": test_errors[:15]
}

with open(PROJECT_ROOT / "data" / "reports" / "full_ml_evaluation_metrics.json", "w") as f:
    json.dump(output_payload, f, indent=2)

print("EVALUATION RUN COMPLETE")
