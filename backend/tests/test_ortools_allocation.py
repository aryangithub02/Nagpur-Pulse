"""
Backend Unit Tests for Google OR-Tools CP-SAT Resource Allocation Engine.
"""

import pytest
from app.database import SessionLocal
from app.services.resource_allocation_service import resource_allocation_service
from app.services.operational_priority_service import operational_priority_service


def test_operational_priority_service_computation():
    """Verify that operational priority service computes demand scores for all junctions."""
    db = SessionLocal()
    try:
        demands = operational_priority_service.compute_demands(db)
        assert isinstance(demands, list)
        assert len(demands) > 0
        for d in demands:
            assert "location_id" in d
            assert "location_name" in d
            assert "priority_score" in d
            assert 0.0 <= d["priority_score"] <= 100.0
            assert "risk_score" in d
            assert "traffic_congestion_score" in d
    finally:
        db.close()


def test_ortools_optimization_solver_execution():
    """Verify that Google OR-Tools CP-SAT solver executes and returns valid status and assignments."""
    db = SessionLocal()
    try:
        result = resource_allocation_service.run_optimization(
            db=db,
            max_eta_minutes=15.0,
            include_patrolling=False,
            solver_time_limit=3.0
        )
        assert result is not None
        assert "optimization_id" in result
        assert result["status"] in ["OPTIMAL", "FEASIBLE", "INFEASIBLE"]
        assert "allocated_units" in result
        assert "risk_weighted_coverage_pct" in result
        assert result["risk_weighted_coverage_pct"] >= 0.0
        assert "assignments" in result

        # Check constraint: each allocated unit appears at most once
        allocated_unit_ids = [a["unit_id"] for a in result["assignments"]]
        assert len(allocated_unit_ids) == len(set(allocated_unit_ids)), "Duplicate unit assignment found!"

        # Check constraint: each assigned unit ETA is within max ETA limit
        for a in result["assignments"]:
            assert a["eta_minutes"] <= 15.0, f"ETA constraint violated for unit {a['unit_id']}"
    finally:
        db.close()
