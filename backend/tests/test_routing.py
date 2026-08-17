from unittest.mock import patch


def test_routing_endpoint_with_mocked_tomtom(client):
    """Test GET /api/routing/unit/{unitId}/to/{junctionId} returns normalized TomTom route geometry."""
    mock_tomtom_data = {
        "distance_meters": 2400,
        "distance_km": 2.4,
        "travel_time_seconds": 360,
        "travel_time_minutes": 6.0,
        "route_geometry": {
            "type": "LineString",
            "coordinates": [
                [79.081757, 21.155618],
                [79.083725, 21.161630]
            ]
        },
        "is_simulated": False
    }

    with patch("app.services.tomtom_service.tomtom_service.calculate_route", return_value=mock_tomtom_data):
        response = client.get("/api/routing/unit/PU001/to/1")
        assert response.status_code == 200
        data = response.json()
        assert data["unitId"] == "PU001"
        assert data["junctionId"] == "1"
        assert data["distanceMeters"] == 2400
        assert data["distanceKm"] == 2.4
        assert data["estimatedTimeSeconds"] == 360
        assert data["estimatedTimeMinutes"] == 6.0
        assert data["routeGeometry"]["type"] == "LineString"
        # Confirm GeoJSON format: coordinates[0] is [longitude, latitude]
        assert data["routeGeometry"]["coordinates"][0] == [79.081757, 21.155618]
        assert data["isSimulated"] is False


def test_routing_invalid_unit_id(client):
    """Test routing request with non-existent unit ID returns 404."""
    response = client.get("/api/routing/unit/NON_EXISTENT_UNIT/to/1")
    assert response.status_code == 404
    assert "detail" in response.json()


def test_routing_invalid_junction_id(client):
    """Test routing request with non-existent junction ID returns 404."""
    response = client.get("/api/routing/unit/PU001/to/999999")
    assert response.status_code == 404
    assert "detail" in response.json()


def test_tomtom_fallback_routing(client):
    """Test that TomTom service gracefully falls back to spatial calculation when unconfigured or timed out."""
    with patch("app.services.tomtom_service.tomtom_service.api_key", ""):
        response = client.get("/api/routing/unit/PU001/to/1")
        assert response.status_code == 200
        data = response.json()
        assert "distanceMeters" in data
        assert "estimatedTimeMinutes" in data
        assert data["routeGeometry"]["type"] == "LineString"
