import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app


@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient fixture for integration testing."""
    with TestClient(app) as test_client:
        yield test_client
