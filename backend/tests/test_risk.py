def test_get_all_risk(client):
    """Test that GET /api/risk returns 200 OK with riskData array."""
    response = client.get("/api/risk")
    assert response.status_code == 200
    data = response.json()
    assert "riskData" in data
    assert isinstance(data["riskData"], list)


def test_get_location_risk(client):
    """Test GET /api/risk/{locationId} for valid location."""
    response = client.get("/api/risk/1")
    assert response.status_code == 200
    data = response.json()
    assert "risk" in data
    assert data["risk"]["locationId"] == "1"
    assert "riskLevel" in data["risk"]
