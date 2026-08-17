"""
Nagpur Pulse — End-to-End Tests for Human Decision & Dispatch Workflow.
Verifies ACCEPT, MODIFY, and REJECT flows across Recommendation, DecisionRecord,
Deployment, PoliceUnit, and AuditLog tables.
"""

import uuid
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database import get_db
from app.models.junction import Junction
from app.models.police_unit import PoliceUnit
from app.models.recommendation import Recommendation
from app.models.decision_record import DecisionRecord
from app.models.deployment import Deployment
from app.models.audit_log import AuditLog
from app.models.user import User


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def db_session():
    # Grab db session from dependency
    db_gen = get_db()
    db = next(db_gen)
    try:
        # Ensure test junction and units exist
        junc = db.query(Junction).filter(Junction.id == 101).first()
        if not junc:
            junc = Junction(id=101, name="Test Chowk", latitude=21.1458, longitude=79.0882)
            db.add(junc)

        u1 = db.query(PoliceUnit).filter(PoliceUnit.id == "PU_TEST_1").first()
        if not u1:
            u1 = PoliceUnit(id="PU_TEST_1", name="PCR Test 1", call_sign="TEST-1", latitude=21.1450, longitude=79.0880, status="AVAILABLE")
            db.add(u1)
        else:
            u1.status = "AVAILABLE"

        u2 = db.query(PoliceUnit).filter(PoliceUnit.id == "PU_TEST_2").first()
        if not u2:
            u2 = PoliceUnit(id="PU_TEST_2", name="PCR Test 2", call_sign="TEST-2", latitude=21.1460, longitude=79.0890, status="AVAILABLE")
            db.add(u2)
        else:
            u2.status = "AVAILABLE"

        db.commit()
        yield db
    finally:
        db.close()


def test_decision_workflow_accept(client, db_session: Session):
    # 1. Setup Recommendation
    rec_id = f"REC_TEST_{uuid.uuid4().hex[:6]}"
    rec = Recommendation(
        id=rec_id,
        location_id=101,
        unit_id="PU_TEST_1",
        reason="HIGH_RISK_SURGE",
        priority="HIGH",
        status="PENDING",
    )
    db_session.add(rec)
    db_session.commit()

    # 2. Execute ACCEPT Decision
    payload = {
        "action": "ACCEPT",
    }
    response = client.post(f"/api/v1/recommendations/{rec_id}/decision", json=payload)
    assert response.status_code == 200
    data = response.json()

    # 3. Assert Response Structure
    assert data["action"] == "ACCEPT"
    assert data["final_unit_id"] == "PU_TEST_1"
    assert data["status"] == "DISPATCHED"
    assert data["dispatch"]["status"] == "DISPATCHED"
    assert data["dispatch"]["dispatch_id"] is not None

    # 4. Assert Database State Consistency
    db_session.expire_all()
    # Recommendation status
    rec_in_db = db_session.query(Recommendation).filter(Recommendation.id == rec_id).first()
    assert rec_in_db.status == "ACCEPTED"

    # PoliceUnit status
    unit_in_db = db_session.query(PoliceUnit).filter(PoliceUnit.id == "PU_TEST_1").first()
    assert unit_in_db.status == "DEPLOYED"

    # Deployment record
    dep_in_db = db_session.query(Deployment).filter(Deployment.recommendation_id == rec_id).first()
    assert dep_in_db is not None
    assert dep_in_db.unit_id == "PU_TEST_1"
    assert dep_in_db.status == "ACTIVE"

    # DecisionRecord
    decision_in_db = db_session.query(DecisionRecord).filter(DecisionRecord.recommendation_id == rec_id).first()
    assert decision_in_db is not None
    assert decision_in_db.final_action == "ACCEPT"
    assert decision_in_db.dispatch_status == "DISPATCHED"

    # AuditLog entry
    audit_in_db = db_session.query(AuditLog).filter(AuditLog.resource_id == decision_in_db.decision_id).first()
    assert audit_in_db is not None
    assert audit_in_db.action == "DECISION_ACCEPT"


def test_decision_workflow_modify(client, db_session: Session):
    # 1. Setup Recommendation
    rec_id = f"REC_TEST_{uuid.uuid4().hex[:6]}"
    rec = Recommendation(
        id=rec_id,
        location_id=101,
        unit_id="PU_TEST_1",
        reason="HIGH_RISK_SURGE",
        priority="HIGH",
        status="PENDING",
    )
    db_session.add(rec)
    db_session.commit()

    # 2. Execute MODIFY Decision to PU_TEST_2
    payload = {
        "action": "MODIFY",
        "selected_unit_id": "PU_TEST_2",
        "reason_code": "BETTER_LOCAL_UNIT",
        "comment": "Unit 2 has shorter response time.",
    }
    response = client.post(f"/api/v1/recommendations/{rec_id}/decision", json=payload)
    assert response.status_code == 200
    data = response.json()

    # 3. Assert Response Structure
    assert data["action"] == "MODIFY"
    assert data["final_unit_id"] == "PU_TEST_2"
    assert data["status"] == "DISPATCHED"
    assert data["dispatch"]["status"] == "DISPATCHED"

    # 4. Assert Database State Consistency
    db_session.expire_all()
    rec_in_db = db_session.query(Recommendation).filter(Recommendation.id == rec_id).first()
    assert rec_in_db.status == "MODIFIED"
    assert rec_in_db.unit_id == "PU_TEST_2"

    unit2_in_db = db_session.query(PoliceUnit).filter(PoliceUnit.id == "PU_TEST_2").first()
    assert unit2_in_db.status == "DEPLOYED"

    dep_in_db = db_session.query(Deployment).filter(Deployment.recommendation_id == rec_id).first()
    assert dep_in_db is not None
    assert dep_in_db.unit_id == "PU_TEST_2"

    decision_in_db = db_session.query(DecisionRecord).filter(DecisionRecord.recommendation_id == rec_id).first()
    assert decision_in_db.final_action == "MODIFY"
    assert decision_in_db.final_unit_id == "PU_TEST_2"
    assert decision_in_db.reason_code == "BETTER_LOCAL_UNIT"


def test_decision_workflow_reject(client, db_session: Session):
    # Reset PU_TEST_1 status
    u1 = db_session.query(PoliceUnit).filter(PoliceUnit.id == "PU_TEST_1").first()
    u1.status = "AVAILABLE"
    db_session.commit()

    # 1. Setup Recommendation
    rec_id = f"REC_TEST_{uuid.uuid4().hex[:6]}"
    rec = Recommendation(
        id=rec_id,
        location_id=101,
        unit_id="PU_TEST_1",
        reason="HIGH_RISK_SURGE",
        priority="HIGH",
        status="PENDING",
    )
    db_session.add(rec)
    db_session.commit()

    # 2. Execute REJECT Decision
    payload = {
        "action": "REJECT",
        "reason_code": "NO_LONGER_REQUIRED",
        "comment": "Traffic cleared spontaneously.",
    }
    response = client.post(f"/api/v1/recommendations/{rec_id}/decision", json=payload)
    assert response.status_code == 200
    data = response.json()

    # 3. Assert Response Structure
    assert data["action"] == "REJECT"
    assert data["final_unit_id"] is None
    assert data["dispatch"]["status"] == "NOT_DISPATCHED"

    # 4. Assert Database State Consistency
    db_session.expire_all()
    rec_in_db = db_session.query(Recommendation).filter(Recommendation.id == rec_id).first()
    assert rec_in_db.status == "REJECTED"

    unit1_in_db = db_session.query(PoliceUnit).filter(PoliceUnit.id == "PU_TEST_1").first()
    assert unit1_in_db.status == "AVAILABLE"

    dep_in_db = db_session.query(Deployment).filter(Deployment.recommendation_id == rec_id).first()
    assert dep_in_db is None

    decision_in_db = db_session.query(DecisionRecord).filter(DecisionRecord.recommendation_id == rec_id).first()
    assert decision_in_db.final_action == "REJECT"
    assert decision_in_db.dispatch_status == "NOT_DISPATCHED"


def test_duplicate_decision_prevention(client, db_session: Session):
    rec_id = f"REC_TEST_{uuid.uuid4().hex[:6]}"
    rec = Recommendation(
        id=rec_id,
        location_id=101,
        unit_id="PU_TEST_1",
        reason="TEST",
        status="PENDING",
    )
    db_session.add(rec)
    db_session.commit()

    # First decision
    r1 = client.post(f"/api/v1/recommendations/{rec_id}/decision", json={"action": "ACCEPT"})
    assert r1.status_code == 200

    # Second duplicate decision
    r2 = client.post(f"/api/v1/recommendations/{rec_id}/decision", json={"action": "ACCEPT"})
    assert r2.status_code == 409
    assert "ALREADY_DECIDED" in r2.json()["error"]
