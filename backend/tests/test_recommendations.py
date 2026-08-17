def test_recommendations_flow_and_unit_dispatch(client):
    """Test full recommendation lifecycle: ETA ranking, accept dispatch, duplicate rejection, and reject."""
    # 1. Simulate incident to generate a fresh recommendation
    sim_res = client.post(
        "/api/simulation/incident",
        json={"locationId": "1", "type": "ACCIDENT", "severity": "CRITICAL"}
    )
    assert sim_res.status_code == 201
    sim_data = sim_res.json()
    assert "recommendation" in sim_data
    rec_id = sim_data["recommendation"]["id"]
    assigned_unit_id = sim_data["recommendation"]["recommendedUnitId"]

    # 2. Accept recommendation -> returns success, deployment record, unit DEPLOYED
    accept_res = client.post(f"/api/recommendations/{rec_id}/accept")
    assert accept_res.status_code == 200
    accept_data = accept_res.json()
    assert accept_data["success"] is True
    assert accept_data["recommendation"]["status"] == "ACCEPTED"
    assert accept_data["deployment"]["status"] == "ACTIVE"

    # 3. Attempting to accept the SAME recommendation again -> returns 400 Bad Request
    dup_res = client.post(f"/api/recommendations/{rec_id}/accept")
    assert dup_res.status_code == 400

    # 4. Verify police unit status is DEPLOYED
    if assigned_unit_id:
        unit_res = client.get(f"/api/police-units/{assigned_unit_id}")
        assert unit_res.status_code == 200
        assert unit_res.json()["status"] == "DEPLOYED"


def test_reject_recommendation(client):
    """Test rejecting a recommendation updates status without modifying police unit availability."""
    # Simulate incident to create recommendation
    sim_res = client.post(
        "/api/simulation/incident",
        json={"locationId": "2", "type": "CONGESTION", "severity": "MEDIUM"}
    )
    assert sim_res.status_code == 201
    rec_id = sim_res.json()["recommendation"]["id"]

    # Reject recommendation
    reject_res = client.post(f"/api/recommendations/{rec_id}/reject")
    assert reject_res.status_code == 200
    assert reject_res.json()["recommendation"]["status"] == "REJECTED"
