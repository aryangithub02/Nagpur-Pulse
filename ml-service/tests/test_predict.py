import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

PROJECT_ROOT = SERVICE_ROOT.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "accidents_7d": 2,
    "accidents_30d": 8,
    "accidents_90d": 21,
    "accidents_1y": 75,
    "fatal_accidents_1y": 3,
    "injury_accidents_1y": 28,
    "historical_accident_rate": 6.25,
    "junction": "Sitabuldi Chowk"
}

def test_predict_valid_input():
    response = client.post("/predict", json=VALID_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert "risk_level" in data
    assert "confidence" in data
    assert "model_version" in data
    assert "probabilities" in data
    assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "UNCERTAIN"]
    assert 0.0 <= data["confidence"] <= 1.0
    assert "LOW" in data["probabilities"]
    assert "MEDIUM" in data["probabilities"]
    assert "HIGH" in data["probabilities"]

def test_predict_missing_feature():
    payload = VALID_PAYLOAD.copy()
    del payload["accidents_7d"]
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()

def test_predict_negative_value():
    payload = VALID_PAYLOAD.copy()
    payload["accidents_7d"] = -5
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()

def test_predict_unexpected_feature():
    payload = VALID_PAYLOAD.copy()
    payload["random_feature"] = 123
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()

def test_predict_invalid_junction():
    payload = VALID_PAYLOAD.copy()
    payload["junction"] = ""
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()
