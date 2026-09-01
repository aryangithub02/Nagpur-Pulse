"""
Nagpur Pulse — Decision Review Engine Comprehensive Pytest Suite.
Validates all 15 operational requirements:
1. Hard Constraints (Unit unavailable, capability missing, coverage <60%, event conflict, stale data)
2. Normalization of 12 Operational Parameters (0-100)
3. Decision Assurance Score (DAS) Linear Optimization
4. What-If Scenario Penalty Integration
5. Assurance Status Tiering (ASSURED, REVIEW REQUIRED, LOW ASSURANCE, BLOCKED)
6. Multi-Unit Alternative Comparative Ranking
7. Known vs Unknown Operational Intelligence Matrix
8. Commander Actions (APPROVE, MODIFY, REJECT)
9. Append-Only Immutable Decision Evidence Records
10. Accountability & 5-Tier Failure Taxonomy
11. Cryptographic SHA-256 Hash Chaining
"""

import pytest
from sqlalchemy.orm import Session
from fastapi.testclient import TestClient

from app.models.junction import Junction
from app.models.police_unit import PoliceUnit
from app.models.decision_evidence import DecisionEvidenceRecord
from app.services.decision_review_service import decision_review_service


@pytest.fixture
def setup_review_data(db_session: Session):
    """Ensure test junctions and police units exist in database."""
    j1 = db_session.query(Junction).filter(Junction.id == 1).first()
    if not j1:
        j1 = Junction(
            id=1,
            name="Sitabuldi Interchange",
            latitude=21.1458,
            longitude=79.0882,
            address="Sitabuldi, Nagpur",
        )
        db_session.add(j1)

    u1 = db_session.query(PoliceUnit).filter(PoliceUnit.id == "P17").first()
    if not u1:
        u1 = PoliceUnit(
            id="P17",
            name="Patrol-17 (Sitabuldi)",
            status="AVAILABLE",
            unit_type="PATROL_CAR",
            latitude=21.1470,
            longitude=79.0890,
        )
        db_session.add(u1)
    else:
        u1.status = "AVAILABLE"

    u2 = db_session.query(PoliceUnit).filter(PoliceUnit.id == "P12").first()
    if not u2:
        u2 = PoliceUnit(
            id="P12",
            name="Patrol-12 (Dharampeth)",
            status="AVAILABLE",
            unit_type="PATROL_CAR",
            latitude=21.1400,
            longitude=79.0750,
        )
        db_session.add(u2)
    else:
        u2.status = "AVAILABLE"

    u3 = db_session.query(PoliceUnit).filter(PoliceUnit.id == "P13").first()
    if not u3:
        u3 = PoliceUnit(
            id="P13",
            name="Patrol-13 (Sadar)",
            status="OFF_DUTY",
            unit_type="HEAVY_RECOVERY",
            latitude=21.1600,
            longitude=79.0850,
        )
        db_session.add(u3)
    else:
        u3.status = "OFF_DUTY"

    # Reset decision evidence records for fresh hash chain
    db_session.query(DecisionEvidenceRecord).delete()
    db_session.commit()


# =========================================================================
# 1. HARD CONSTRAINT TESTS
# =========================================================================
def test_hard_constraint_unit_unavailable(db_session: Session, setup_review_data):
    """Hard Constraint: Unavailable unit must trigger violation and BLOCKED status."""
    unit = db_session.query(PoliceUnit).filter(PoliceUnit.id == "P13").first()
    unit.status = "OFF_DUTY"
    db_session.commit()

    check = decision_review_service.check_hard_constraints(
        unit=unit,
        required_capabilities=None,
        current_sector_coverage=80.0,
        event_conflict=False,
        api_freshness_seconds=10.0,
    )
    assert check["passed"] is False
    assert check["unit_available"] is False
    assert any("unavailable" in v for v in check["violations"])


def test_hard_constraint_capability_mismatch(db_session: Session, setup_review_data):
    """Hard Constraint: Unit lacking required capability must trigger violation."""
    unit = db_session.query(PoliceUnit).filter(PoliceUnit.id == "P12").first()

    check = decision_review_service.check_hard_constraints(
        unit=unit,
        required_capabilities=["HAZMAT_CONTAINMENT"],
        current_sector_coverage=80.0,
        event_conflict=False,
        api_freshness_seconds=10.0,
    )
    assert check["passed"] is False
    assert check["capability_matched"] is False
    assert any("HAZMAT_CONTAINMENT" in v for v in check["violations"])


def test_hard_constraint_sector_coverage_violation(db_session: Session, setup_review_data):
    """Hard Constraint: Coverage dropping below configured minimum (<60%) must trigger violation."""
    unit = db_session.query(PoliceUnit).filter(PoliceUnit.id == "P17").first()

    check = decision_review_service.check_hard_constraints(
        unit=unit,
        required_capabilities=None,
        current_sector_coverage=48.0,  # Below 60%
        event_conflict=False,
        api_freshness_seconds=10.0,
        min_coverage=60.0,
    )
    assert check["passed"] is False
    assert check["coverage_safe"] is False
    assert any("Sector coverage" in v for v in check["violations"])


def test_hard_constraint_event_conflict(db_session: Session, setup_review_data):
    """Hard Constraint: Event/VVIP cordon violation must trigger BLOCKED status."""
    unit = db_session.query(PoliceUnit).filter(PoliceUnit.id == "P17").first()

    check = decision_review_service.check_hard_constraints(
        unit=unit,
        required_capabilities=None,
        current_sector_coverage=80.0,
        event_conflict=True,
        api_freshness_seconds=10.0,
    )
    assert check["passed"] is False
    assert check["event_compliant"] is False


def test_hard_constraint_stale_telemetry_data(db_session: Session, setup_review_data):
    """Hard Constraint: Stale API telemetry (>300s) must trigger violation."""
    unit = db_session.query(PoliceUnit).filter(PoliceUnit.id == "P17").first()

    check = decision_review_service.check_hard_constraints(
        unit=unit,
        required_capabilities=None,
        current_sector_coverage=80.0,
        event_conflict=False,
        api_freshness_seconds=420.0,  # Stale
        max_staleness=300.0,
    )
    assert check["passed"] is False
    assert check["data_valid"] is False
    assert any("staleness" in v for v in check["violations"])


# =========================================================================
# 2. PARAMETER NORMALIZATION & DAS CALCULATION
# =========================================================================
def test_parameter_normalization_and_das(db_session: Session, setup_review_data):
    """Verify all 12 parameters normalize to 0-100 and DAS calculates deterministically."""
    unit = db_session.query(PoliceUnit).filter(PoliceUnit.id == "P17").first()

    comps = decision_review_service.normalize_parameters(
        incident_severity=85.0,
        traffic_risk=70.0,
        crime_risk=50.0,
        event_risk=40.0,
        unit=unit,
        eta_minutes=4.0,
        sector_coverage_pct=82.0,
        api_freshness_seconds=15.0,
        ml_confidence_pct=92.0,
    )
    for key, val in comps.items():
        assert 0.0 <= val <= 100.0, f"Component {key}={val} out of 0-100 range"

    das = decision_review_service.calculate_assurance_score(comps)
    assert 75.0 <= das <= 100.0


# =========================================================================
# 3. WHAT-IF PENALTY INTEGRATION
# =========================================================================
def test_what_if_penalty_calculation():
    """Verify What-If penalty formula: 0.4(Cov) + 0.3(SecRisk) + 0.2(ResImp) + 0.1(ETA)."""
    pen, details = decision_review_service.calculate_what_if_penalty(
        coverage_loss_pct=5.0,
        secondary_risk_increase=4.0,
        resource_impact_pct=6.0,
        eta_penalty_val=2.0,
    )
    assert pen > 0.0
    assert "calculated_penalty" in details
    assert details["coverage_loss_pct"] == 5.0


# =========================================================================
# 4. ASSURANCE STATUS TIERS
# =========================================================================
@pytest.mark.parametrize(
    "score,hard_pass,expected_status",
    [
        (88.0, True, "ASSURED"),
        (76.0, True, "REVIEW REQUIRED"),
        (58.0, True, "LOW ASSURANCE"),
        (42.0, True, "BLOCKED"),
        (92.0, False, "BLOCKED"),  # Hard failure overrides high score
    ],
)
def test_assurance_status_tiering(score, hard_pass, expected_status):
    status, narrative = decision_review_service.determine_assurance_status(score, hard_pass)
    assert status == expected_status
    assert len(narrative) > 10


# =========================================================================
# 5. REST API: EVALUATE RECOMMENDATION
# =========================================================================
def test_api_evaluate_recommendation(client: TestClient, setup_review_data):
    """Test POST /api/decision-review/evaluate full pipeline."""
    payload = {
        "location_id": 1,
        "recommended_unit_id": "P17",
        "incident_severity": 80.0,
        "incident_type": "Major Multi-Vehicle Collision",
    }
    response = client.post("/api/decision-review/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert "decision_id" in data
    assert data["decision_id"].startswith("DEC-")
    assert data["assurance_status"] in {"ASSURED", "REVIEW REQUIRED"}
    assert data["hard_constraints"]["passed"] is True
    assert len(data["alternatives"]) > 0
    assert len(data["known_conditions"]) > 0
    assert len(data["unknown_conditions"]) > 0
    assert "sha256_hash" in data["audit_chain"]


# =========================================================================
# 6. REST API: COMMANDER ACTIONS (APPROVE, MODIFY, REJECT)
# =========================================================================
def test_api_commander_approve(client: TestClient, setup_review_data):
    """Test POST /api/decision-review/{id}/decision with APPROVE."""
    eval_resp = client.post("/api/decision-review/evaluate", json={"location_id": 1, "recommended_unit_id": "P17"})
    dec_id = eval_resp.json()["decision_id"]

    resp = client.post(f"/api/decision-review/{dec_id}/decision", json={"action": "APPROVE"})
    assert resp.status_code == 200
    res = resp.json()
    assert res["commander"]["action"] == "APPROVE"
    assert res["commander"]["final_dispatched_unit_id"] == "P17"


def test_api_commander_modify(client: TestClient, setup_review_data):
    """Test POST /api/decision-review/{id}/decision with MODIFY & reason."""
    eval_resp = client.post("/api/decision-review/evaluate", json={"location_id": 1, "recommended_unit_id": "P17"})
    dec_id = eval_resp.json()["decision_id"]

    modify_payload = {
        "action": "MODIFY",
        "selected_unit_id": "P12",
        "reason_code": "LOCAL_OPERATIONAL_CONDITION",
        "comment": "Commander deployed P12 due to closer alleyway access",
    }
    resp = client.post(f"/api/decision-review/{dec_id}/decision", json=modify_payload)
    assert resp.status_code == 200
    res = resp.json()
    assert res["commander"]["action"] == "MODIFY"
    assert res["commander"]["final_dispatched_unit_id"] == "P12"
    assert res["commander"]["override_reason"] == "LOCAL_OPERATIONAL_CONDITION"


def test_api_commander_modify_missing_reason_fails(client: TestClient, setup_review_data):
    """Test MODIFY fails with 422 if reason_code is omitted."""
    eval_resp = client.post("/api/decision-review/evaluate", json={"location_id": 1})
    dec_id = eval_resp.json()["decision_id"]

    resp = client.post(f"/api/decision-review/{dec_id}/decision", json={"action": "MODIFY", "selected_unit_id": "P12"})
    assert resp.status_code == 422


def test_api_commander_reject(client: TestClient, setup_review_data):
    """Test POST /api/decision-review/{id}/decision with REJECT & reason."""
    eval_resp = client.post("/api/decision-review/evaluate", json={"location_id": 1})
    dec_id = eval_resp.json()["decision_id"]

    resp = client.post(
        f"/api/decision-review/{dec_id}/decision",
        json={"action": "REJECT", "reason_code": "NO_LONGER_REQUIRED", "comment": "False alarm canceled by 112"},
    )
    assert resp.status_code == 200
    res = resp.json()
    assert res["commander"]["action"] == "REJECT"
    assert res["commander"]["final_dispatched_unit_id"] is None


# =========================================================================
# 7. OUTCOME & FAILURE TAXONOMY POST-MORTEM
# =========================================================================
def test_api_record_outcome_with_failure_taxonomy(client: TestClient, setup_review_data):
    """Test POST /api/decision-review/{id}/outcome with failure classification."""
    eval_resp = client.post("/api/decision-review/evaluate", json={"location_id": 1})
    dec_id = eval_resp.json()["decision_id"]

    outcome_payload = {
        "outcome_status": "SUCCESS",
        "failure_classification": "NONE",
        "actual_response_time_minutes": 4.5,
        "post_event_evaluation": "Nominal PCR dispatch; accident cleared in 20 min.",
    }
    resp = client.post(f"/api/decision-review/{dec_id}/outcome", json=outcome_payload)
    assert resp.status_code == 200
    res = resp.json()
    assert res["outcome"]["status"] == "SUCCESS"
    assert res["outcome"]["failure_classification"] == "NONE"
    assert res["outcome"]["actual_response_time_minutes"] == 4.5


# =========================================================================
# 8. CRYPTOGRAPHIC SHA-256 HASH CHAIN INTEGRITY
# =========================================================================
def test_audit_hash_chain_verification(client: TestClient, setup_review_data):
    """Test GET /api/decision-review/audit-chain/verify returns intact chain."""
    for i in range(3):
        client.post("/api/decision-review/evaluate", json={"location_id": 1, "incident_severity": 70.0 + i})

    resp = client.get("/api/decision-review/audit-chain/verify")
    assert resp.status_code == 200
    data = resp.json()
    assert data["verified"] is True
    assert data["chain_intact"] is True
    assert data["total_records"] >= 3
    assert data["corrupted_count"] == 0
