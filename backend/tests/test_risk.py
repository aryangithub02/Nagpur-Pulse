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


def test_get_risk_v1_endpoints(client):
    """Test Phase 10 v1 risk endpoints (summary, high-risk, critical, history)."""
    sum_resp = client.get("/api/v1/risk/summary")
    assert sum_resp.status_code == 200
    sum_data = sum_resp.json()
    assert "total_junctions" in sum_data
    assert "average_risk_score" in sum_data

    high_resp = client.get("/api/v1/risk/high-risk")
    assert high_resp.status_code == 200
    assert "junctions" in high_resp.json()

    crit_resp = client.get("/api/v1/risk/critical")
    assert crit_resp.status_code == 200
    assert "junctions" in crit_resp.json()

    hist_resp = client.get("/api/v1/risk/history/1")
    assert hist_resp.status_code == 200
    assert "history" in hist_resp.json()
