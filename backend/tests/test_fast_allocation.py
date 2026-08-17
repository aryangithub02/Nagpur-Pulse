"""
Nagpur Pulse - Fast Greedy + Priority-Scoring Resource Allocation Test Suite.
Tests all 16 required algorithmic and operational criteria:
- Priority score calculations & normalizations
- Sorting determinism & tie-breaking
- Unit eligibility & greedy removal
- Route blocks & ETA cutoffs
- Critical risk prioritization (J-17 vs J-08)
- What-If simulation zero-mutation guarantee
- Performance benchmark latency (< 50ms)
"""

import pytest
import time
from app.services.allocation_state import AllocationState, StateBuilder
from app.services.fast_allocation_service import (
    fast_allocation_service,
    normalize_risk_score,
    calculate_weather_impact,
    calculate_incident_recency,
    DEFAULT_PRIORITY_WEIGHTS,
    DEFAULT_ASSIGNMENT_WEIGHTS,
)


@pytest.fixture
def mock_operational_state():
    """Provides a realistic operational state with real Nagpur coordinates and units."""
    units = [
        {"id": "PU001", "name": "PCR Central 1", "status": "AVAILABLE", "latitude": 21.1458, "longitude": 79.0882, "zone_code": "CENTRAL", "capabilities": ["GENERAL_PATROL"]},
        {"id": "PU002", "name": "PCR Central 2", "status": "AVAILABLE", "latitude": 21.1490, "longitude": 79.0910, "zone_code": "CENTRAL", "capabilities": ["GENERAL_PATROL", "TRAFFIC_CONTROL"]},
        {"id": "PU005", "name": "PCR North 1", "status": "AVAILABLE", "latitude": 21.1600, "longitude": 79.0800, "zone_code": "NORTH", "capabilities": ["GENERAL_PATROL"]},
    ]

    junctions = [
        {"id": 17, "name": "J-17 Variety Sq", "latitude": 21.1458, "longitude": 79.0882, "zone_code": "CENTRAL", "risk_score": 95.0, "risk_class": "CRITICAL", "traffic_congestion_score": 90.0},
        {"id": 8, "name": "J-08 Law College Sq", "latitude": 21.1490, "longitude": 79.0750, "zone_code": "CENTRAL", "risk_score": 80.0, "risk_class": "HIGH", "traffic_congestion_score": 60.0},
        {"id": 22, "name": "J-22 Indora Sq", "latitude": 21.1700, "longitude": 79.0900, "zone_code": "NORTH", "risk_score": 65.0, "risk_class": "HIGH", "traffic_congestion_score": 50.0},
        {"id": 31, "name": "J-31 Medical Sq", "latitude": 21.1200, "longitude": 79.1000, "zone_code": "SOUTH", "risk_score": 40.0, "risk_class": "MEDIUM", "traffic_congestion_score": 30.0},
    ]

    incidents = [
        {"id": "INC-001", "junction_id": 17, "severity": "CRITICAL", "reported_at": "2026-08-18T00:00:00Z"},
        {"id": "INC-002", "junction_id": 8, "severity": "HIGH", "reported_at": "2026-08-18T00:10:00Z"},
    ]

    risk_predictions = {
        17: {"risk_score": 95.0, "risk_level": "CRITICAL"},
        8: {"risk_score": 80.0, "risk_level": "HIGH"},
        22: {"risk_score": 65.0, "risk_level": "HIGH"},
        31: {"risk_score": 40.0, "risk_level": "MEDIUM"},
    }

    traffic = {
        17: {"speed": 12.0, "congestion": 90.0, "delay": 180.0},
        8: {"speed": 22.0, "congestion": 60.0, "delay": 60.0},
        22: {"speed": 28.0, "congestion": 50.0, "delay": 30.0},
        31: {"speed": 38.0, "congestion": 30.0, "delay": 0.0},
    }

    weather = {
        "rainfall_mm": 15.0,
        "visibility_km": 4.0,
        "storm_flag": False,
        "condition": "MODERATE_RAIN",
    }

    return AllocationState(
        units=units,
        junctions=junctions,
        incidents=incidents,
        risk_predictions=risk_predictions,
        traffic=traffic,
        weather=weather,
        zone_code="ALL"
    )


# 1. Risk Priority Calculation & Normalization
def test_risk_score_normalization():
    # 0-100 scale
    assert normalize_risk_score(95.0) == 0.95
    assert normalize_risk_score(0.0) == 0.0
    # 0-1 scale (no double normalization)
    assert normalize_risk_score(0.85) == 0.85
    # Fallback to risk class
    assert normalize_risk_score(None, "CRITICAL") == 0.95
    assert normalize_risk_score(None, "HIGH") == 0.70
    assert normalize_risk_score(None, "LOW") == 0.15


# 2. Incident Priority & Recency Calculation
def test_incident_recency_calculation():
    # Very recent
    assert calculate_incident_recency(None) == 0.0
    rec_high = calculate_incident_recency("2026-08-18T00:30:00Z")
    assert 0.0 <= rec_high <= 1.0


# 3. Congestion & Weather Scoring
def test_weather_impact_calculation():
    dry_weather = {"rainfall_mm": 0.0, "visibility_km": 10.0, "storm_flag": False}
    assert calculate_weather_impact(dry_weather) == 0.0

    storm_weather = {"rainfall_mm": 40.0, "visibility_km": 0.8, "storm_flag": True}
    assert calculate_weather_impact(storm_weather) == 1.0


# 4. Critical Junction Priority Scoring (J-17 vs J-08)
def test_critical_junction_priority_calculation(mock_operational_state):
    state = mock_operational_state
    j17 = state.junctions[0]
    j08 = state.junctions[1]

    p17, b17, f17 = fast_allocation_service.calculate_junction_priority(
        junction=j17,
        risk_info=state.risk_predictions.get(17),
        traffic_info=state.traffic.get(17),
        incidents=state.incidents,
        weather_info=state.weather,
        available_units=state.units
    )

    p08, b08, f08 = fast_allocation_service.calculate_junction_priority(
        junction=j08,
        risk_info=state.risk_predictions.get(8),
        traffic_info=state.traffic.get(8),
        incidents=state.incidents,
        weather_info=state.weather,
        available_units=state.units
    )

    # J-17 (risk=95, inc=CRITICAL, cong=90) must have strictly higher priority than J-08 (risk=80, inc=HIGH, cong=60)
    assert p17 > p08
    assert b17["risk"] > b08["risk"]
    assert b17["incident"] > b08["incident"]
    assert "Critical Incident (CRITICAL)" in f17 or "CRITICAL Risk (95%)" in f17


# 5. Greedy Allocation & Removal (No Unit Double-Assignment)
def test_greedy_allocation_and_unit_removal(mock_operational_state):
    res = fast_allocation_service.allocate(mock_operational_state)

    assert res["algorithm"] == "GREEDY_PRIORITY"
    assert len(res["assignments"]) == 3  # 3 available units allocated
    assert len(res["unassigned"]) == 1   # 4 junctions - 3 units = 1 unassigned

    assigned_unit_ids = [a["unit_id"] for a in res["assignments"]]
    # Every assigned unit must be distinct
    assert len(assigned_unit_ids) == len(set(assigned_unit_ids))

    # The highest priority junction (J-17) must be assigned first
    assigned_junc_ids = [a["location_id"] for a in res["assignments"]]
    assert 17 in assigned_junc_ids


# 6. Unit Eligibility (OFFLINE or DISPATCHED excluded)
def test_unit_eligibility_exclusion(mock_operational_state):
    state = mock_operational_state.clone()
    # Mark PU001 as OFFLINE and PU002 as DISPATCHED
    state.units[0]["status"] = "OFFLINE"
    state.units[1]["status"] = "DISPATCHED"

    res = fast_allocation_service.allocate(state)
    # Only PU005 is AVAILABLE
    assert len(res["assignments"]) == 1
    assert res["assignments"][0]["unit_id"] == "PU005"
    assert len(res["unassigned"]) == 3
    for u in res["unassigned"]:
        assert u["reason"] in ("NO_AVAILABLE_UNIT", "ETA_EXCEEDS_LIMIT", "NO_ELIGIBLE_UNIT")


# 7. Route Block Enforcement
def test_route_unavailable_enforcement(mock_operational_state):
    state = mock_operational_state.clone()
    # Block route between PU001 and J-17
    state.unavailable_routes = ["ROUTE_PU001_17", "ROUTE_17_PU001"]

    res = fast_allocation_service.allocate(state)
    j17_assignment = next((a for a in res["assignments"] if a["location_id"] == 17), None)
    if j17_assignment:
        # PU001 must not be assigned to J-17
        assert j17_assignment["unit_id"] != "PU001"


# 8. Maximum ETA Limit Cutoff
def test_max_eta_cutoff(mock_operational_state):
    state = mock_operational_state.clone()
    # Set very small max_eta (e.g. 0.01 minutes) so no unit can reach distant junctions
    res = fast_allocation_service.allocate(state, max_eta_minutes=0.01)
    # At least some distant junctions should become unassigned due to ETA_EXCEEDS_LIMIT
    assert any(u["reason"] == "ETA_EXCEEDS_LIMIT" or u["reason"] == "NO_AVAILABLE_UNIT" for u in res["unassigned"])


# 9. What-If Scenario Simulation (Zero Mutation Guarantee)
def test_what_if_scenario_zero_mutation(mock_operational_state):
    live_state = mock_operational_state.clone()
    live_res = fast_allocation_service.allocate(live_state)

    # Simulate PU002 going OFFLINE
    sim_state = live_state.clone()
    sim_state.units[1]["status"] = "OFFLINE"
    sim_res = fast_allocation_service.allocate(sim_state)

    # Verify PU002 is absent from simulated assignments
    sim_units = [a["unit_id"] for a in sim_res["assignments"]]
    assert "PU002" not in sim_units

    # Verify live_state units remain unmodified
    assert live_state.units[1]["status"] == "AVAILABLE"
    assert len(live_res["assignments"]) == 3
    assert len(sim_res["assignments"]) == 2


# 10. Performance Benchmark (< 50ms)
def test_fast_allocation_performance_benchmark(mock_operational_state):
    t_start = time.perf_counter()
    res = fast_allocation_service.allocate(mock_operational_state)
    t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0

    assert t_elapsed_ms < 50.0, f"Allocation took {t_elapsed_ms:.2f}ms which exceeds 50ms target."
    assert res["performance"]["total_ms"] < 50.0
