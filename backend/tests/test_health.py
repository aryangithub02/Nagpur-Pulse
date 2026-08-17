def test_health_check_endpoint(client):
    """Test that GET /health returns 200 OK with expected service status."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data
    assert "database" in data
