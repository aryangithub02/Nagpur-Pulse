# Nagpur Pulse — ML Service API Documentation (Phase 4)

## Overview
The Nagpur Pulse ML Service is a high-performance FastAPI inference microservice that loads the trained Phase 3 **Random Forest** model (`rf_v1`) into memory on application startup. It consumes Phase 2 feature stores and raw junction attributes to produce multi-class traffic risk predictions, continuous risk index scores ($0.0 \text{ to } 100.0$), and 4-class probability distributions (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).

---

## Service Endpoints (`/api/v1/ml/*`)

### 1. Health Check
`GET /api/v1/ml/health`

#### Response (`200 OK`):
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model": "RandomForest",
  "model_version": "rf_v1",
  "feature_version": "features_v1"
}
```

---

### 2. Model Information & Metrics
`GET /api/v1/ml/model`

#### Response (`200 OK`):
```json
{
  "model": "RandomForest",
  "version": "rf_v1",
  "feature_version": "features_v1",
  "target": "traffic_risk",
  "metrics": {
    "accuracy": 0.9729,
    "macro_f1": 0.5228,
    "high_recall": 0.75,
    "critical_recall": 0.0
  }
}
```

---

### 3. Single Junction Traffic Risk Prediction
`POST /api/v1/ml/predict`

#### Request Payload:
```json
{
  "junction_id": "JNGP001",
  "timestamp": "2026-08-17T18:30:00",
  "month": 8,
  "accidents_lag_1": 2.0,
  "accidents_rolling_mean_3": 1.67,
  "junction_ordinal_enc": 1.0
}
```

#### Response (`200 OK`):
```json
{
  "junction_id": "JNGP001",
  "prediction": {
    "risk_level": "HIGH",
    "risk_score": 72.4,
    "probabilities": {
      "LOW": 0.04,
      "MEDIUM": 0.14,
      "HIGH": 0.68,
      "CRITICAL": 0.14
    }
  },
  "model": {
    "name": "RandomForest",
    "version": "rf_v1"
  },
  "timestamp": "2026-08-17T18:30:00"
}
```

---

### 4. Vectorized Batch Prediction
`POST /api/v1/ml/predict/batch`

#### Request Payload:
```json
{
  "predictions": [
    { "junction_id": "JNGP001", "accidents_lag_1": 0.0 },
    { "junction_id": "JNGP002", "accidents_lag_1": 4.0 }
  ]
}
```

#### Response (`200 OK`):
```json
{
  "results": [
    {
      "junction_id": "JNGP001",
      "prediction": {
        "risk_level": "LOW",
        "risk_score": 0.0,
        "probabilities": { "LOW": 1.0, "MEDIUM": 0.0, "HIGH": 0.0, "CRITICAL": 0.0 }
      },
      "model": { "name": "RandomForest", "version": "rf_v1" },
      "timestamp": "2026-08-17T18:30:00"
    },
    {
      "junction_id": "JNGP002",
      "prediction": {
        "risk_level": "HIGH",
        "risk_score": 70.0,
        "probabilities": { "LOW": 0.05, "MEDIUM": 0.15, "HIGH": 0.70, "CRITICAL": 0.10 }
      },
      "model": { "name": "RandomForest", "version": "rf_v1" },
      "timestamp": "2026-08-17T18:30:00"
    }
  ]
}
```

---

### 5. Junction Risk Retrieval
`GET /api/v1/ml/risk/{junction_id}`

#### Response (`200 OK`):
```json
{
  "junction_id": "JNGP001",
  "risk_score": 72.4,
  "risk_level": "HIGH",
  "probabilities": {
    "LOW": 0.04,
    "MEDIUM": 0.14,
    "HIGH": 0.68,
    "CRITICAL": 0.14
  },
  "prediction_time": "2026-08-17T18:30:00",
  "model_version": "rf_v1"
}
```

---

### 6. All Monitored Junction Risks
`GET /api/v1/ml/risk`

#### Response (`200 OK`):
```json
{
  "junctions": [
    {
      "junction_id": "JNGP001",
      "risk_score": 72.4,
      "risk_level": "HIGH"
    },
    {
      "junction_id": "JNGP002",
      "risk_score": 15.0,
      "risk_level": "LOW"
    }
  ]
}
```

---

## Continuous Risk Index Formula
$$\text{Risk Score} = P(\text{LOW}) \times 0 + P(\text{MEDIUM}) \times 35 + P(\text{HIGH}) \times 70 + P(\text{CRITICAL}) \times 100$$
Score range: $0.0 \le \text{risk\_score} \le 100.0$.
