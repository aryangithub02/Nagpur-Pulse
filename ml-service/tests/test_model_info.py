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

def test_model_info():
    response = client.get("/model/info")
    assert response.status_code == 200
    data = response.json()
    assert "model_version" in data
    assert "model_type" in data
    assert data["status"] == "loaded"
    assert data["model_version"] == "traffic-risk-v1"
    assert data["model_type"] == "CalibratedClassifierCV"
