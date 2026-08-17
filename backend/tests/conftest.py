import os
import sys
import pytest
from fastapi.testclient import TestClient

# Add backend root to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal
from app.models.police_unit import PoliceUnit


@pytest.fixture(autouse=True)
def reset_police_units():
    """Ensure police units are AVAILABLE before each test run."""
    session = SessionLocal()
    try:
        session.query(PoliceUnit).update({"status": "AVAILABLE"})
        session.commit()
    except Exception:
        session.rollback()
    finally:
        session.close()


@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient fixture for integration testing."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="function")
def db_session():
    """Provides a fresh database session for unit & integration testing."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
