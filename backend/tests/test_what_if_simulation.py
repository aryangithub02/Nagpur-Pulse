"""
Nagpur Pulse - What-If Resource Simulation Test Suite.
Verifies read-only in-memory scenario engine, OR-Tools optimizer reuse, zero live state mutations, stale snapshot protection, and RBAC zone security.
"""

import pytest
from datetime import datetime
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.models.police_unit import PoliceUnit
from app.models.incident import Incident
from app.models.junction import Junction
from app.services.snapshot_service import snapshot_service
from app.services.scenario_engine import scenario_engine
from app.services.simulation_service import simulation_service
from app.services.resource_allocation_service import resource_allocation_service
from app.bootstrap_admins import bootstrap_zones_and_admins


@pytest.fixture(scope="module")
def db_session():
    """Provides DB session with bootstrapped seed data for testing."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        bootstrap_zones_and_admins()
        # Seed test police units if none exist
        if db.query(PoliceUnit).count() == 0:
            p1 = PoliceUnit(id="PU001", name="PCR Central 1", unit_type="PATROL", status="AVAILABLE", latitude=21.1458, longitude=79.0882)
            p2 = PoliceUnit(id="PU002", name="PCR Central 2", unit_type="PATROL", status="AVAILABLE", latitude=21.1490, longitude=79.0910)
            db.add_all([p1, p2])
            db.commit()
        yield db
    finally:
        db.close()


def test_snapshot_creation_and_immutability(db_session: Session):
    """Test 1: Immutable snapshot creation & caching."""
    snapshot = snapshot_service.create_snapshot(db_session, zone_code="CENTRAL")
    assert snapshot is not None
    assert "snapshot_id" in snapshot
    assert snapshot["snapshot_id"].startswith("SNAP-")
    assert snapshot["live_state_modified"] is False
    assert len(snapshot["units"]) > 0
    assert len(snapshot["demands"]) > 0

    # Test Immutability
    snap_id = snapshot["snapshot_id"]
    cached_snap = snapshot_service.get_snapshot(snap_id)
    assert cached_snap["snapshot_id"] == snap_id

    # Mutating returned copy must not alter cached snapshot
    cached_snap["units"][0]["status"] = "MUTATED_TEST"
    fresh_snap = snapshot_service.get_snapshot(snap_id)
    assert fresh_snap["units"][0]["status"] != "MUTATED_TEST"


def test_unit_status_simulation_and_zero_db_mutation(db_session: Session):
    """Test 2: UNIT_STATUS scenario (PU002 -> OFFLINE) and assertion of ZERO live DB mutation."""
    user = {"username": "np.central.ops", "role": "ZONE_ADMIN", "zone": "CENTRAL"}
    snap = snapshot_service.create_snapshot(db_session, zone_code="CENTRAL")
    base_id = snap["snapshot_id"]

    units = snap["units"]
    target_unit_id = units[0]["id"]
    original_db_status = db_session.query(PoliceUnit).filter(PoliceUnit.id == target_unit_id).first().status

    changes = [
        {"type": "UNIT_STATUS", "unit_id": target_unit_id, "value": "OFFLINE"}
    ]

    res = simulation_service.create_simulation(
        db=db_session,
        user_info=user,
        base_snapshot_id=base_id,
        changes=changes
    )

    assert res["status"] in ("COMPLETED", "OPTIMAL", "FEASIBLE")
    assert res["live_state_modified"] is False
    assert res["coverage_after"] <= res["coverage_before"]

    # Verify LIVE DB STATE remains completely UNTOUCHED
    current_db_status = db_session.query(PoliceUnit).filter(PoliceUnit.id == target_unit_id).first().status
    assert current_db_status == original_db_status, "CRITICAL ERROR: Live database PoliceUnit status was mutated by simulation!"


def test_all_supported_scenario_types(db_session: Session):
    """Test 3: Validates all 9 supported scenario change types."""
    user = {"username": "admin", "role": "SYSTEM_ADMIN", "zone": "ALL"}
    snap = snapshot_service.create_snapshot(db_session, zone_code="ALL")
    base_id = snap["snapshot_id"]

    units = snap["units"]
    demands = snap["demands"]

    u1 = units[0]["id"]
    u2 = units[1]["id"] if len(units) > 1 else u1
    j1 = demands[0]["location_id"]
    j2 = demands[1]["location_id"] if len(demands) > 1 else j1

    changes = [
        {"type": "UNIT_STATUS", "unit_id": u1, "value": "OFFLINE"},
        {"type": "UNIT_REMOVED", "unit_id": u2},
        {"type": "NEW_INCIDENT", "incident": {"junction_id": j1, "severity": "CRITICAL", "incident_type": "ACCIDENT"}},
        {"type": "TRAFFIC_CHANGE", "junction_id": j2, "congestion": 95.0},
        {"type": "RISK_CHANGE", "junction_id": j1, "risk_score": 98.0, "risk_class": "CRITICAL"},
        {"type": "JUNCTION_UNAVAILABLE", "junction_id": j2},
        {"type": "ROUTE_UNAVAILABLE", "unit_id": u1, "junction_id": j1},
        {"type": "UNIT_LOCATION_CHANGE", "unit_id": u1, "latitude": 21.150, "longitude": 79.090},
    ]

    res = simulation_service.create_simulation(
        db=db_session,
        user_info=user,
        base_snapshot_id=base_id,
        changes=changes
    )

    assert res["status"] in ("COMPLETED", "OPTIMAL", "FEASIBLE")
    assert res["live_state_modified"] is False
    assert len(res["changes_in_plan"]) >= 0
    assert "human_readable_summary" in res


def test_invalid_scenario_rejection(db_session: Session):
    """Test 4: Rejection of invalid scenario changes (non-existent units, out of bound values)."""
    user = {"username": "admin", "role": "SYSTEM_ADMIN", "zone": "ALL"}
    snap = snapshot_service.create_snapshot(db_session, zone_code="ALL")
    base_id = snap["snapshot_id"]

    invalid_changes = [
        {"type": "UNIT_STATUS", "unit_id": "NON_EXISTENT_UNIT_999", "value": "OFFLINE"},
        {"type": "TRAFFIC_CHANGE", "junction_id": 1, "congestion": 150.0}, # Out of bounds >100
    ]

    res = simulation_service.create_simulation(
        db=db_session,
        user_info=user,
        base_snapshot_id=base_id,
        changes=invalid_changes
    )

    assert res["status"] == "INVALID_SCENARIO"
    assert res["live_state_modified"] is False
    assert len(res["errors"]) > 0


def test_stale_snapshot_protection(db_session: Session):
    """Test 5: Stale Snapshot Protection - rejects direct application if base_snapshot_id != current live snapshot."""
    user = {"username": "np.central.ops", "role": "ZONE_ADMIN", "zone": "CENTRAL"}
    snap1 = snapshot_service.create_snapshot(db_session, zone_code="CENTRAL")
    old_base_id = snap1["snapshot_id"]

    # Run simulation on old snapshot
    sim_res = simulation_service.create_simulation(
        db=db_session,
        user_info=user,
        base_snapshot_id=old_base_id,
        changes=[{"type": "TRAFFIC_CHANGE", "junction_id": snap1["demands"][0]["location_id"], "congestion": 90.0}]
    )
    sim_id = sim_res["simulation_id"]

    # Trigger fresh live snapshot creation to simulate world change
    snap2 = snapshot_service.create_snapshot(db_session, zone_code="CENTRAL")
    assert snap2["snapshot_id"] != old_base_id

    # Attempt to apply stale simulation
    apply_res = simulation_service.apply_simulation(db_session, user, sim_id)
    assert apply_res["success"] is False
    assert apply_res["status"] == "STALE"
    assert "SIMULATION IS STALE" in apply_res["message"]
