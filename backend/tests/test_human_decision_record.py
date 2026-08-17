"""
Nagpur Pulse - Human Decision Record & Audit Trail Test Suite.
Tests Human-in-the-Loop decision workflows (ACCEPT, MODIFY, REJECT),
immutability, RBAC zone authorization, stale protection, and audit logging.
"""

import pytest
import json
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.junction import Junction
from app.models.police_unit import PoliceUnit
from app.models.recommendation import Recommendation
from app.models.decision_record import DecisionRecord
from app.models.audit_log import AuditLog
from app.services.decision_service import DecisionService
from app.services.audit_service import AuditService


@pytest.fixture
def setup_recommendation_data(db_session: Session):
    """Sets up test junctions, police units, and PENDING recommendations."""
    j17 = db_session.query(Junction).filter(Junction.id == 17).first()
    if not j17:
        j17 = Junction(
            id=17,
            name="J-17 Variety Sq",
            latitude=21.1458,
            longitude=79.0882,
            zone_code="CENTRAL"
        )
        db_session.add(j17)

    j08 = db_session.query(Junction).filter(Junction.id == 8).first()
    if not j08:
        j08 = Junction(
            id=8,
            name="J-08 Law College Sq",
            latitude=21.1490,
            longitude=79.0750,
            zone_code="NORTH"
        )
        db_session.add(j08)

    pu5 = db_session.query(PoliceUnit).filter(PoliceUnit.id == "PU005").first()
    if not pu5:
        pu5 = PoliceUnit(
            id="PU005",
            name="PCR Unit 5",
            unit_type="PATROL",
            status="AVAILABLE",
            latitude=21.1450,
            longitude=79.0870,
            zone_code="CENTRAL"
        )
        db_session.add(pu5)

    pu7 = db_session.query(PoliceUnit).filter(PoliceUnit.id == "PU007").first()
    if not pu7:
        pu7 = PoliceUnit(
            id="PU007",
            name="PCR Unit 7",
            unit_type="PATROL",
            status="AVAILABLE",
            latitude=21.1460,
            longitude=79.0880,
            zone_code="CENTRAL"
        )
        db_session.add(pu7)

    db_session.commit()

    rec_id = f"REC-TEST-{int(datetime.utcnow().timestamp())}"
    rec = Recommendation(
        id=rec_id,
        location_id=17,
        unit_id="PU005",
        reason="ACCIDENT; HIGH_CONGESTION; RAINFALL",
        priority="HIGH",
        estimated_distance=2.5,
        estimated_time=5.0,
        status="PENDING",
        created_at=datetime.utcnow()
    )
    db_session.add(rec)
    db_session.commit()

    return {
        "rec_id": rec_id,
        "j17_id": 17,
        "j08_id": 8,
        "pu5_id": "PU005",
        "pu7_id": "PU007",
    }


def test_accept_decision_workflow_and_live_dispatch(db_session: Session, setup_recommendation_data):
    """Test 1: ACCEPT action creates decision record, audit event, and dispatches recommended unit."""
    rec_id = setup_recommendation_data["rec_id"]
    user = {"user_id": 1, "username": "np.central.ops", "role": "ZONE_ADMIN", "zone": "CENTRAL"}

    success, code, res = DecisionService.record_decision(
        db=db_session,
        user_info=user,
        recommendation_id=rec_id,
        action="ACCEPT"
    )

    assert success is True
    assert code == 200
    assert res["action"] == "ACCEPT"
    assert res["status"] in ("DISPATCHED", "RECORDED")
    assert res["recommended_unit_id"] == "PU005"
    assert res["final_unit_id"] == "PU005"
    assert res["operator"]["username"] == "np.central.ops"

    # Verify Audit Event Created
    audit = db_session.query(AuditLog).filter(AuditLog.resource_id == res["decision_id"]).first()
    assert audit is not None
    assert audit.action == "DECISION_ACCEPT"


def test_modify_decision_workflow_and_reason_validation(db_session: Session, setup_recommendation_data):
    """Test 2: MODIFY action selects different human unit, requires valid reason code, and logs audit diff."""
    # Create new recommendation
    rec_id = f"REC-MOD-{int(datetime.utcnow().timestamp())}"
    rec = Recommendation(
        id=rec_id,
        location_id=17,
        unit_id="PU005",
        reason="TRAFFIC_CONGESTION",
        priority="HIGH",
        status="PENDING"
    )
    db_session.add(rec)
    db_session.commit()

    user = {"user_id": 1, "username": "np.central.ops", "role": "ZONE_ADMIN", "zone": "CENTRAL"}

    # Test Missing Reason Code (Should Fail 422)
    s1, c1, r1 = DecisionService.record_decision(
        db=db_session,
        user_info=user,
        recommendation_id=rec_id,
        action="MODIFY",
        selected_unit_id="PU007"
    )
    assert s1 is False
    assert c1 == 422

    # Test Valid MODIFY
    s2, c2, r2 = DecisionService.record_decision(
        db=db_session,
        user_info=user,
        recommendation_id=rec_id,
        action="MODIFY",
        selected_unit_id="PU007",
        reason_code="LOCAL_OPERATIONAL_CONDITION",
        comment="PU007 is already nearby."
    )

    assert s2 is True
    assert c2 == 200
    assert r2["action"] == "MODIFY"
    assert r2["recommended_unit_id"] == "PU005"
    assert r2["final_unit_id"] == "PU007"
    assert r2["reason_code"] == "LOCAL_OPERATIONAL_CONDITION"


def test_reject_decision_workflow_and_zero_dispatch(db_session: Session, setup_recommendation_data):
    """Test 3: REJECT action closes recommendation without executing any police dispatch."""
    rec_id = f"REC-REJ-{int(datetime.utcnow().timestamp())}"
    rec = Recommendation(
        id=rec_id,
        location_id=17,
        unit_id="PU005",
        reason="INCIDENT_REPORTED",
        priority="MEDIUM",
        status="PENDING"
    )
    db_session.add(rec)
    db_session.commit()

    user = {"user_id": 1, "username": "np.central.ops", "role": "ZONE_ADMIN", "zone": "CENTRAL"}

    success, code, res = DecisionService.record_decision(
        db=db_session,
        user_info=user,
        recommendation_id=rec_id,
        action="REJECT",
        reason_code="INCIDENT_RESOLVED",
        comment="Cleared prior to dispatch."
    )

    assert success is True
    assert code == 200
    assert res["action"] == "REJECT"
    assert res["dispatch"]["status"] == "NOT_DISPATCHED"

    # Verify Recommendation is CLOSED
    db_rec = db_session.query(Recommendation).filter(Recommendation.id == rec_id).first()
    assert db_rec.status == "CLOSED"


def test_duplicate_decision_prevention_409_conflict(db_session: Session, setup_recommendation_data):
    """Test 4: Attempting to decide an already decided recommendation returns 409 CONFLICT."""
    rec_id = setup_recommendation_data["rec_id"]
    user = {"user_id": 1, "username": "np.central.ops", "role": "ZONE_ADMIN", "zone": "CENTRAL"}

    # Second decision attempt on already accepted recommendation
    success, code, res = DecisionService.record_decision(
        db=db_session,
        user_info=user,
        recommendation_id=rec_id,
        action="MODIFY",
        selected_unit_id="PU007",
        reason_code="BETTER_LOCAL_UNIT"
    )

    assert success is False
    assert code == 409
    assert res["error"] == "RECOMMENDATION_ALREADY_DECIDED"


def test_zone_rbac_authorization_isolation(db_session: Session, setup_recommendation_data):
    """Test 5: Zone Admin in NORTH zone cannot decide CENTRAL zone recommendation."""
    # Create fresh Central recommendation
    rec_id = f"REC-ZONE-{int(datetime.utcnow().timestamp())}"
    rec = Recommendation(
        id=rec_id,
        location_id=17, # Central Zone location
        unit_id="PU005",
        reason="TEST",
        priority="LOW",
        status="PENDING"
    )
    db_session.add(rec)
    db_session.commit()

    north_user = {"user_id": 2, "username": "np.north.ops", "role": "ZONE_ADMIN", "zone": "NORTH"}

    success, code, res = DecisionService.record_decision(
        db=db_session,
        user_info=north_user,
        recommendation_id=rec_id,
        action="ACCEPT"
    )

    assert success is False
    assert code == 403
    assert res["error"] == "ZONE_ACCESS_DENIED"


def test_stale_recommendation_revalidation_failure(db_session: Session):
    """Test 6: Deciding an already CLOSED recommendation fails with 409 RECOMMENDATION_STALE."""
    rec_id = f"REC-STALE-{int(datetime.utcnow().timestamp())}"
    rec = Recommendation(
        id=rec_id,
        location_id=17,
        unit_id="PU005",
        reason="STALE_TEST",
        priority="LOW",
        status="CLOSED"
    )
    db_session.add(rec)
    db_session.commit()

    user = {"user_id": 1, "username": "np.central.ops", "role": "ZONE_ADMIN", "zone": "CENTRAL"}

    success, code, res = DecisionService.record_decision(
        db=db_session,
        user_info=user,
        recommendation_id=rec_id,
        action="ACCEPT"
    )

    assert success is False
    assert code == 409
    assert res["error"] == "RECOMMENDATION_STALE"


def test_human_override_analytics(db_session: Session):
    """Test 7: Validates Human Override analytics calculation."""
    analytics = AuditService.get_human_override_analytics(db_session, user_zone="CENTRAL")
    assert "total_recommendations_decided" in analytics
    assert "rates" in analytics
    assert "ai_human_agreement_pct" in analytics["rates"]
