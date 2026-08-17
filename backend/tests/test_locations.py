def test_get_locations(client):
    """Test that GET /api/locations returns 200 OK and locations list."""
    response = client.get("/api/locations")
    assert response.status_code == 200
    data = response.json()
    assert "locations" in data
    assert isinstance(data["locations"], list)
    if len(data["locations"]) > 0:
        first = data["locations"][0]
        assert "id" in first
        assert "name" in first
        assert "latitude" in first
        assert "longitude" in first


def test_get_invalid_junction_id(client):
    """Test that requesting an invalid/non-existent junction ID returns 404 Not Found."""
    response = client.get("/api/coverage/999999")
    assert response.status_code == 404
    data = response.json()
    assert "detail" in data
