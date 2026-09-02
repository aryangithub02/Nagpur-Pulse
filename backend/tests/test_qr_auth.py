"""
Unit tests for QR Device Asymmetric Authentication flow.
Verifies session generation, challenge-response signature verification,
and device allowance decision branching (YES -> Access Granted, NO -> Reject).
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_generate_qr_session():
    """Step 1: Server generates one-time QR session challenge with 256-bit nonce."""
    response = client.post("/api/v1/auth/qr/generate-session")
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["session_id"].startswith("QR-")
    assert "challenge" in data
    assert len(data["challenge"]) == 64  # 32 bytes hex
    assert data["status"] == "PENDING"
    assert "qr_payload" in data


def test_poll_qr_session_status():
    """Step 2: Browser polls session status while waiting for device scan."""
    gen_res = client.post("/api/v1/auth/qr/generate-session")
    session_id = gen_res.json()["session_id"]

    status_res = client.get(f"/api/v1/auth/qr/status/{session_id}")
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["session_id"] == session_id
    assert status_data["status"] == "PENDING"
    assert status_data["authenticated"] is False


def test_verify_signature_allowed_device_yes():
    """Step 3 & 4: Allowed device submits signature -> Server verifies -> Access Granted (YES)."""
    gen_res = client.post("/api/v1/auth/qr/generate-session")
    session_id = gen_res.json()["session_id"]

    verify_payload = {
        "session_id": session_id,
        "username": "admin",
        "device_id": "NGP-SEC-KEY-01",
        "device_name": "Nagpur Police HQ Hardware Key (Admin-Primary)",
        "public_key": "PUB_KEY_ED25519_ADMIN_PRIMARY_KEY",
        "signature": "SIG_ECDSA_4F8A3C9B1E2D7E8F5A6B0C1D2E3F4A5B",
        "algorithm": "ECDSA_P256"
    }

    verify_res = client.post("/api/v1/auth/qr/verify-signature", json=verify_payload)
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["success"] is True
    assert data["decision"] == "YES"
    assert data["device_allowed"] is True
    assert "access_token" in data

    # Verify session status is now APPROVED
    poll_res = client.get(f"/api/v1/auth/qr/status/{session_id}")
    assert poll_res.json()["status"] == "APPROVED"
    assert poll_res.json()["authenticated"] is True


def test_verify_signature_unauthorized_device_no():
    """Step 3 & 4: Rogue/Unauthorized device submits signature -> Server verifies -> Rejected (NO)."""
    gen_res = client.post("/api/v1/auth/qr/generate-session")
    session_id = gen_res.json()["session_id"]

    verify_payload = {
        "session_id": session_id,
        "username": "admin",
        "device_id": "ROGUE-DEVICE-UNAUTHORIZED-99",
        "device_name": "Unregistered Hacker Device",
        "public_key": "PUB_KEY_UNREGISTERED_9999",
        "signature": "SIG_ECDSA_INVALID_ROGUE_KEY_9999",
        "algorithm": "ECDSA_P256"
    }

    verify_res = client.post("/api/v1/auth/qr/verify-signature", json=verify_payload)
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["success"] is False
    assert data["decision"] == "NO"
    assert data["device_allowed"] is False
    assert data["status"] == "REJECTED"

    # Verify session status is now REJECTED
    poll_res = client.get(f"/api/v1/auth/qr/status/{session_id}")
    assert poll_res.json()["status"] == "REJECTED"
    assert poll_res.json()["authenticated"] is False
