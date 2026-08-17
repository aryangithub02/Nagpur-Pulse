import pytest
from app.database import SessionLocal
from app.services.traffic_service import traffic_service
from app.services.incident_service import incident_service
from app.services.police_unit_service import police_unit_service
from app.services.risk_service import risk_service
from app.services.coverage_service import coverage_service
from app.services.routing_service import routing_service
from app.services.deployment_service import deployment_service
from app.exceptions import LocationNotFoundException, UnitNotFoundException, UnitUnavailableException


@pytest.fixture
def db_session():
    """DB session fixture for direct service testing."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def test_police_unit_service_direct(db_session):
    """Test PoliceUnitService methods directly."""
    units = police_unit_service.get_units(db_session)
    assert isinstance(units, list)
    assert len(units) > 0

    first_unit = units[0]
    unit_id = first_unit.id
    fetched = police_unit_service.get_unit(db_session, unit_id)
    assert fetched.id == unit_id

    # Test invalid unit
    with pytest.raises(UnitNotFoundException):
        police_unit_service.get_unit(db_session, "NON_EXISTENT_UNIT")


def test_incident_service_direct(db_session):
    """Test IncidentService methods directly."""
    incidents = incident_service.get_incidents(db_session)
    assert isinstance(incidents, list)

    sim_data = {"locationId": "1", "type": "HAZARD", "severity": "MEDIUM"}
    inc, rec = incident_service.simulate_incident(db_session, sim_data)
    assert inc.is_simulated is True
    assert rec is not None


def test_risk_service_direct(db_session):
    """Test RiskService methods directly."""
    risk_list = risk_service.get_risk(db_session)
    assert isinstance(risk_list, list)
    assert len(risk_list) > 0
    first_risk = risk_list[0]
    assert "locationId" in first_risk
    assert "riskLevel" in first_risk


def test_coverage_service_direct(db_session):
    """Test CoverageService methods directly."""
    coverage = coverage_service.get_coverage(db_session)
    assert "overallCoveragePercentage" in coverage
    assert "locations" in coverage
    assert len(coverage["locations"]) > 0


def test_routing_service_direct(db_session):
    """Test RoutingService methods directly."""
    units = police_unit_service.get_units(db_session)
    if units:
        unit_id = units[0].id
        route = routing_service.calculate_route(db_session, unit_id, "1")
        assert "distance_meters" in route
        assert "travel_time_minutes" in route
        assert "route_geometry" in route
