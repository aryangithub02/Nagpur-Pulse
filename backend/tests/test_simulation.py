def test_simulate_incident(client):
    """Test simulating an incident via POST /api/simulation/incident."""
    payload = {
        "locationId": "1",
        "type": "ACCIDENT",
        "severity": "HIGH",
        "description": "Pytest automated simulated incident"
    }
    response = client.post("/api/simulation/incident", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "incident" in data
    assert "recommendation" in data
    assert data["incident"]["locationId"] == "1"
    assert data["incident"]["type"] == "ACCIDENT"
    assert data["incident"]["isSimulated"] is True


def test_simulate_incident_invalid_location(client):
    """Test incident simulation for non-existent location ID returns 404."""
    payload = {
        "locationId": "999999",
        "type": "HAZARD",
        "severity": "LOW"
    }
    response = client.post("/api/simulation/incident", json=payload)
    assert response.status_code == 404
