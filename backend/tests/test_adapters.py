"""
Nagpur Pulse — Unit & Contract Tests for Integration-Ready Adapter Layer.
Validates that all external data adapters produce canonical schemas, validate inputs,
track provenance, handle provider failures, and support configuration-based provider switching.
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.adapters.schemas.provenance import DataProvenance, QualityFlag, SourceType
from app.adapters.schemas.traffic import CanonicalTrafficState, TrafficLevel, speed_to_level, congestion_to_level
from app.adapters.schemas.weather import CanonicalWeatherState
from app.adapters.schemas.police import CanonicalPoliceUnitState, PoliceUnitStatus
from app.adapters.schemas.routing import CanonicalRouteResult

from app.adapters.traffic.tomtom import TomTomTrafficAdapter
from app.adapters.traffic.simulated import SimulatedTrafficAdapter
from app.adapters.traffic.government import GovernmentTrafficAdapter
from app.adapters.traffic.factory import TrafficAdapterFactory

from app.adapters.weather.openweather import OpenWeatherAdapter
from app.adapters.weather.simulated import SimulatedWeatherAdapter

from app.adapters.police.simulated import SimulatedPoliceAdapter
from app.adapters.police.government import GovernmentPoliceAdapter

from app.adapters.routing.tomtom import TomTomRoutingAdapter
from app.adapters.routing.simulated import SimulatedRoutingAdapter

from app.adapters.health import provider_health_service
from app.services.allocation_state import StateBuilder
from app.services.fast_allocation_service import FastAllocationService


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


# ==============================================================================
# 1. CANONICAL TRAFFIC ADAPTER TESTS
# ==============================================================================

def test_tomtom_traffic_adapter_normalization():
    adapter = TomTomTrafficAdapter()
    assert adapter.provider_name == "TOMTOM"

    raw_tomtom_json = {
        "flowSegmentData": {
            "currentSpeed": 14.2,
            "freeFlowSpeed": 40.0,
            "currentTravelTime": 180,
            "freeFlowTravelTime": 60,
            "confidence": 0.94,
        }
    }

    spatial_ctx = {
        "junction_id": 17,
        "spatial_id": "JNGP017",
        "latitude": 21.1458,
        "longitude": 79.0882,
    }

    results = adapter.normalize(raw_tomtom_json, spatial_context=spatial_ctx)
    assert len(results) == 1
    t = results[0]

    assert isinstance(t, CanonicalTrafficState)
    assert t.junction_id == 17
    assert t.spatial_id == "JNGP017"
    assert t.speed_kmh == 14.2
    assert t.free_flow_speed_kmh == 40.0
    assert t.congestion_percent > 60.0
    assert t.delay_minutes == 2.0
    assert t.traffic_level in ["HEAVY", "STANDSTILL"]
    assert t.provenance.source_provider == "TOMTOM"
    assert t.provenance.quality_score == 0.94


def test_simulated_traffic_adapter_normalization():
    adapter = SimulatedTrafficAdapter()
    assert adapter.provider_name == "SIMULATED"

    raw_data = {
        "junction_id": 5,
        "traffic_data": {
            "current_speed": 28.5,
            "free_flow_speed": 40.0,
            "congestion_level": 28.75,
            "delay_minutes": 1.2,
            "traffic_level": "LIGHT",
        }
    }

    results = adapter.normalize(raw_data)
    assert len(results) == 1
    t = results[0]

    assert isinstance(t, CanonicalTrafficState)
    assert t.junction_id == 5
    assert t.speed_kmh == 28.5
    assert t.traffic_level == "LIGHT"
    assert t.provenance.source_provider == "SIMULATED"


def test_traffic_adapter_factory_switching():
    tomtom_ad = TrafficAdapterFactory.create("tomtom")
    assert isinstance(tomtom_ad, TomTomTrafficAdapter)

    sim_ad = TrafficAdapterFactory.create("simulated")
    assert isinstance(sim_ad, SimulatedTrafficAdapter)

    gov_ad = TrafficAdapterFactory.create("government")
    assert isinstance(gov_ad, GovernmentTrafficAdapter)


def test_traffic_validation():
    adapter = TomTomTrafficAdapter()
    # Invalid speed and coordinates
    bad_state = CanonicalTrafficState(
        junction_id=1,
        spatial_id="JNGP001",
        latitude=99.0, # out of Nagpur bounds
        longitude=180.0,
        speed_kmh=-10.0, # negative
        congestion_percent=150.0 # > 100
    )
    is_valid, flags = adapter.validate(bad_state)
    assert not is_valid
    assert "OUT_OF_RANGE" in flags
    assert "INVALID_COORDINATES" in flags


# ==============================================================================
# 2. CANONICAL WEATHER ADAPTER TESTS
# ==============================================================================

def test_openweather_adapter_normalization():
    adapter = OpenWeatherAdapter()
    assert adapter.provider_name == "OPENWEATHER"

    raw_openweather = {
        "main": {"temp": 32.4, "feels_like": 35.0, "humidity": 70, "pressure": 1010},
        "wind": {"speed": 4.5, "deg": 120},
        "clouds": {"all": 40},
        "rain": {"1h": 2.5},
        "visibility": 8000,
        "weather": [{"id": 500, "main": "Rain"}],
    }

    state = adapter.normalize_current(raw_openweather)
    assert isinstance(state, CanonicalWeatherState)
    assert state.temperature_c == 32.4
    assert state.humidity_percent == 70.0
    assert state.precipitation_mm == 2.5
    assert state.visibility_km == 8.0
    assert state.weather_condition == "Rain"
    assert state.provenance.source_provider == "OPENWEATHER"
    assert state.provenance.quality_score >= 0.90


def test_simulated_weather_adapter():
    adapter = SimulatedWeatherAdapter()
    state = adapter.normalize_current({})
    assert isinstance(state, CanonicalWeatherState)
    assert state.temperature_c == 28.0
    assert state.provenance.source_provider == "SIMULATED"


# ==============================================================================
# 3. CANONICAL POLICE ADAPTER TESTS
# ==============================================================================

def test_simulated_police_adapter():
    adapter = SimulatedPoliceAdapter()
    raw_units = [
        {
            "id": "PU001",
            "name": "Central PCR 01",
            "call_sign": "EAGLE-1",
            "vehicle_type": "PCR_VAN",
            "latitude": 21.1458,
            "longitude": 79.0882,
            "zone_code": "CENTRAL",
            "status": "AVAILABLE",
        },
        {
            "id": "PU002",
            "name": "North Interceptor 02",
            "call_sign": "FALCON-2",
            "vehicle_type": "MOTORCYCLE",
            "latitude": 21.1700,
            "longitude": 79.0900,
            "zone_code": "NORTH",
            "status": "PATROLLING",
        }
    ]

    canonical_units = adapter.normalize_units(raw_units)
    assert len(canonical_units) == 2
    assert canonical_units[0].unit_id == "PU001"
    assert canonical_units[0].call_sign == "EAGLE-1"
    assert canonical_units[0].status == "AVAILABLE"
    assert canonical_units[1].zone_code == "NORTH"
    assert canonical_units[0].provenance.source_provider == "SIMULATED_ROSTER"


# ==============================================================================
# 4. CANONICAL ROUTING ADAPTER TESTS
# ==============================================================================

def test_simulated_routing_adapter():
    adapter = SimulatedRoutingAdapter()
    assert adapter.provider_name == "SIMULATED_HAVERSINE"

    route = adapter.calculate_route(
        origin_lat=21.1458,
        origin_lon=79.0882,
        dest_lat=21.1600,
        dest_lon=79.0950,
        origin_unit_id="PU001",
        dest_junction_id="1"
    )

    assert isinstance(route, CanonicalRouteResult)
    assert route.origin_unit_id == "PU001"
    assert route.distance_km > 0.0
    assert route.duration_minutes > 0.0
    assert route.is_simulated is True
    assert "coordinates" in route.route_geometry


# ==============================================================================
# 5. PROVIDER HEALTH SERVICE & API TESTS
# ==============================================================================

def test_provider_health_service():
    provider_health_service.record_success("traffic", "TOMTOM", 150.0)
    provider_health_service.record_failure("weather", "OPENWEATHER", "HTTP 503")

    summary = provider_health_service.get_health_summary()
    assert "providers" in summary
    assert summary["providers"]["traffic"]["status"] == "HEALTHY"
    assert summary["providers"]["traffic"]["provider"] == "TOMTOM"
    assert summary["providers"]["weather"]["consecutive_failures"] >= 1


def test_system_provider_api_endpoints(client):
    r1 = client.get("/api/v1/system/providers")
    assert r1.status_code == 200
    p_data = r1.json()
    assert "traffic" in p_data
    assert "weather" in p_data
    assert "police" in p_data
    assert "routing" in p_data

    r2 = client.get("/api/v1/system/providers/health")
    assert r2.status_code == 200
    h_data = r2.json()
    assert "providers" in h_data


# ==============================================================================
# 6. FAST ALLOCATION INTEGRATION WITH CANONICAL DATA & PROVENANCE
# ==============================================================================

def test_fast_allocation_with_canonical_state():
    mock_snapshot = {
        "units": [
            {"id": "PU001", "name": "Unit 1", "status": "AVAILABLE", "latitude": 21.1458, "longitude": 79.0882, "zone_code": "CENTRAL"}
        ],
        "demands": [
            {"id": 1, "name": "LIC Chowk", "latitude": 21.1460, "longitude": 79.0890, "zone_code": "CENTRAL", "risk_score": 75.0, "risk_level": "HIGH"}
        ],
        "unavailable_routes": [],
        "unavailable_junctions": [],
    }

    result = FastAllocationService.run_allocation_on_state(
        units=mock_snapshot["units"],
        demands=mock_snapshot["demands"]
    )

    assert result["algorithm"] == "GREEDY_PRIORITY"
    assert len(result["assignments"]) == 1
    assert result["assignments"][0]["unit_id"] == "PU001"
    assert "data_provenance" in result
    assert "traffic_provider" in result["data_provenance"]
    assert "weather_provider" in result["data_provenance"]
