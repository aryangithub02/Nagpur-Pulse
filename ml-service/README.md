# Nagpur Pulse - ML Service

FastAPI microservice for real-time traffic accident risk predictions, historical data ingestion, junction reference matching, and feature engineering.

---

## 1. Project Structure

```text
ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── predictor.py
│   ├── model_loader.py
│   ├── pipeline/
│   │   ├── __init__.py
│   │   ├── accident_ingestion.py
│   │   ├── junction_matcher.py
│   │   ├── feature_engineering.py
│   │   ├── feature_assembler.py
│   │   └── validators.py
│   ├── adapters/
│   │   ├── __init__.py
│   │   ├── traffic.py
│   │   ├── incidents.py
│   │   ├── parking.py
│   │   ├── weather.py
│   │   └── events.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── risk.py
│   │   └── common.py
│   └── services/
│       ├── __init__.py
│       └── risk_service.py
├── data/
│   ├── raw/
│   │   ├── nagpur_accidents_2020_2025.xlsx
│   │   └── README.md
│   ├── references/
│   │   ├── nagpur_first_20_junctions.json
│   │   ├── nagpur_second_20_junctions.json
│   │   └── README.md
│   └── processed/
│       └── README.md
├── models/
│   └── xgboost_calibrated_v1.joblib
├── scripts/
│   ├── ingest_accidents.py
│   ├── build_features.py
│   └── validate_dataset.py
├── tests/
│   ├── __init__.py
│   ├── test_health.py
│   ├── test_model_info.py
│   ├── test_predict.py
│   ├── test_ingestion.py
│   ├── test_junction_matcher.py
│   ├── test_feature_engineering.py
│   └── test_assembler_and_adapters.py
├── requirements.txt
├── .gitignore
└── README.md
```

---

## 2. Data Provenance & Feature Engineering

### Data Provenance Tags
Every ingested accident record includes explicit provenance tags:
- `data_source`: `"SIMULATED"` | `"HISTORICAL"` | `"EXTERNAL"`
- `is_simulated`: `true` | `false`

### Data Leakage Prevention
Feature calculation for prediction timestamp $T$ enforces strict boundary filtering: only historical events strictly prior to $T$ ($t < T$) are included.

### Feature Definitions
- `accidents_7d`: Total accident count in 7 days prior to $T$.
- `accidents_30d`: Total accident count in 30 days prior to $T$.
- `accidents_90d`: Total accident count in 90 days prior to $T$.
- `accidents_1y`: Total accident count in 365 days prior to $T$.
- `fatal_accidents_1y`: Fatal accidents count in 365 days prior to $T$.
- `injury_accidents_1y`: Injured persons total in 365 days prior to $T$.
- `historical_accident_rate`: `accidents_1y / 12.0` (monthly average).
- `junction`: Normalized string name of the junction.

---

## 3. Pipeline CLI Scripts

### 1. Ingest Historical Accident Dataset
```powershell
python scripts/ingest_accidents.py
```

### 2. Validate Dataset & Quality Audit Report
```powershell
python scripts/validate_dataset.py
```

### 3. Build Feature Vector for Junction
```powershell
python scripts/build_features.py --junction "Sitabuldi Chowk"
```

---

## 4. Running the Service & Tests

### Start Server
```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### Run Tests
```powershell
# Run full pytest test suite
pytest

# Run core predictor tests from project root
python -m src.test_predictor
python -m src.predictor
```
