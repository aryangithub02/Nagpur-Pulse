# Nagpur Pulse — ML Service Architecture & Inference Service

## Architecture Overview
The Nagpur Pulse ML Service encapsulates model preprocessing, feature engineering, offline evaluation, model selection, and real-time inference serving.

```
Frontend Dashboards
       ↓
Backend Service (FastAPI)
       ↓
   RiskService
       ↓
ML Inference API (/api/v1/ml/*)
       ↓
Feature Pipeline (Phase 2)
       ↓
Random Forest Model (Phase 3: selected_model.pkl)
       ↓
Continuous Risk Score & Class Probabilities
```

---

## Directory Structure
```
ml/
├── api/
│   ├── routes.py          # FastAPI Router implementing /api/v1/ml/*
│   └── schemas.py         # Pydantic v2 Request & Response contracts
├── inference/
│   └── predictor.py       # Production RiskPredictor inference engine
├── models/
│   ├── selected_model.pkl # Serialized Phase 3 Random Forest model
│   ├── random_forest.pkl  # Backup Random Forest model
│   ├── xgboost.json       # XGBoost model artifact
│   ├── model_metadata.json# Model version & Phase 3 evaluation metrics
│   └── feature_schema.json# Canonical list of 30 feature names
├── features/
│   ├── pipeline.py        # Phase 2 reusable feature engineering pipeline
│   └── build_feature_store.py
├── training/
│   └── train.py           # Reproducible Phase 3 training script
└── reports/
    ├── model_comparison.csv
    ├── classification_report.json
    ├── model_evaluation.json
    ├── error_analysis.csv
    └── training_report.md
```

---

## Model Selection & Benchmark Metrics
- **Selected Architecture**: `RandomForest` (`rf_v1`)
- **Accuracy**: `97.29%`
- **Macro F1**: `52.28%`
- **HIGH-Risk Recall**: `75.0%`
- **Safety Criterion**: Prioritizes minimizing false negatives for dangerous high-risk junctions over raw accuracy.

---

## Local Development & Running Tests

### Run ML Inference Service:
```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Execute Test Suite:
```bash
python -m pytest ml-service/tests/test_ml_api.py ml-service/tests/test_model_training.py
```
