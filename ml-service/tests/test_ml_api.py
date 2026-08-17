"""
Automated FastAPI Unit & Integration Tests for Phase 4 ML Service API (/api/v1/ml/*).
"""

from fastapi.testclient import TestClient
import pytest
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify GET /api/v1/ml/health returns HTTP 200 and healthy status."""
    response = client.get("/api/v1/ml/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert "model" in data
    assert "model_version" in data
    assert "feature_version" in data


def test_model_info_endpoint():
    """Verify GET /api/v1/ml/model returns metadata and Phase 3 metrics."""
    response = client.get("/api/v1/ml/model")
    assert response.status_code == 200
    data = response.json()
    assert data["model"] == "RandomForest"
    assert data["version"] == "rf_v1"
    assert data["target"] == "traffic_risk"
    assert "metrics" in data
    assert "accuracy" in data["metrics"]
    assert "macro_f1" in data["metrics"]
    assert "high_recall" in data["metrics"]


def test_single_predict_endpoint_valid():
    """Verify POST /api/v1/ml/predict with valid payload."""
    payload = {
        "junction_id": "JNGP001",
        "timestamp": "2026-08-17T18:30:00",
        "month": 8,
        "accidents_lag_1": 1.0,
        "accidents_rolling_mean_3": 1.5,
    }
    response = client.post("/api/v1/ml/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["junction_id"] == "JNGP001"
    assert "prediction" in data
    assert data["prediction"]["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert 0.0 <= data["prediction"]["risk_score"] <= 100.0
    assert "probabilities" in data["prediction"]
    assert "model" in data
    assert data["model"]["name"] == "RandomForest"


def test_single_predict_endpoint_invalid_schema():
    """Verify POST /api/v1/ml/predict with missing junction_id returns HTTP 422."""
    payload = {"month": 15}  # Invalid month & missing junction_id
    response = client.post("/api/v1/ml/predict", json=payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data or "detail" in data


def test_batch_predict_endpoint():
    """Verify POST /api/v1/ml/predict/batch with multiple junctions."""
    payload = {
        "predictions": [
            {"junction_id": "JNGP001", "accidents_lag_1": 0.0},
            {"junction_id": "JNGP002", "accidents_lag_1": 4.0},
            {"junction_id": "JNGP003", "accidents_lag_1": 1.0},
        ]
    }
    response = client.post("/api/v1/ml/predict/batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert len(data["results"]) == 3
    assert data["results"][0]["junction_id"] == "JNGP001"
    assert data["results"][1]["junction_id"] == "JNGP002"
    assert data["results"][2]["junction_id"] == "JNGP003"


def test_junction_risk_endpoint():
    """Verify GET /api/v1/ml/risk/{junction_id} returns latest risk item."""
    # Predict first
    client.post("/api/v1/ml/predict", json={"junction_id": "JNGP999", "accidents_lag_1": 2.0})

    response = client.get("/api/v1/ml/risk/JNGP999")
    assert response.status_code == 200
    data = response.json()
    assert data["junction_id"] == "JNGP999"
    assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    assert 0.0 <= data["risk_score"] <= 100.0


def test_all_junctions_risk_endpoint():
    """Verify GET /api/v1/ml/risk returns list of monitored junction risk assessments."""
    response = client.get("/api/v1/ml/risk")
    assert response.status_code == 200
    data = response.json()
    assert "junctions" in data
    assert len(data["junctions"]) > 0
