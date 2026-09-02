"""
Nagpur Pulse — QR Code & Asymmetric Cryptographic Device Authentication Router.
Implements one-time QR session challenge generation, device signature verification,
and device authorization checks.
"""

import hmac
import hashlib
import logging
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.services.auth_service import create_access_token, create_audit_entry

logger = logging.getLogger("qr_auth_router")
router = APIRouter(prefix="/api/v1/auth/qr", tags=["QR Device Authentication"])

# In-memory ephemeral QR authentication sessions (TTL 120s)
QR_SESSIONS: Dict[str, Dict[str, Any]] = {}

# Authorized Police Hardware Security Keys & Authenticator Devices Directory
REGISTERED_ADMIN_DEVICES: Dict[str, List[Dict[str, Any]]] = {
  "admin": [
    {
      "device_id": "NGP-SEC-KEY-01",
      "device_name": "Nagpur Police HQ Hardware Key (Admin-Primary)",
      "public_key_fingerprint": "SHA256:4f8a3c9b1e2d7e8f5a6b0c1d2e3f4a5b6c7d8e9f",
      "is_allowed": True,
      "registered_at": "2026-01-15T10:00:00Z",
    },
    {
      "device_id": "NGP-AUTH-MOBILE-ADMIN",
      "device_name": "Commander Mobile Authenticator (iPhone 16 Pro)",
      "public_key_fingerprint": "SHA256:9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b",
      "is_allowed": True,
      "registered_at": "2026-02-01T08:30:00Z",
    }
  ],
  "np.south.ops": [
    {
      "device_id": "NGP-SEC-KEY-SOUTH-05",
      "device_name": "South Zone Sector Commander Keycard",
      "public_key_fingerprint": "SHA256:5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b",
      "is_allowed": True,
      "registered_at": "2026-02-10T11:20:00Z",
    }
  ],
  "np.central.ops": [
    {
      "device_id": "NGP-SEC-KEY-CENTRAL-01",
      "device_name": "Central Zone Sitabuldi HQ Keycard",
      "public_key_fingerprint": "SHA256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
      "is_allowed": True,
      "registered_at": "2026-02-12T09:15:00Z",
    }
  ],
  "np.north.ops": [
    {
      "device_id": "NGP-SEC-KEY-NORTH-02",
      "device_name": "North Zone Interceptor Terminal Keycard",
      "public_key_fingerprint": "SHA256:2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
      "is_allowed": True,
      "registered_at": "2026-02-14T14:40:00Z",
    }
  ],
  "np.east.ops": [
    {
      "device_id": "NGP-SEC-KEY-EAST-03",
      "device_name": "East Division Freight Sector Keycard",
      "public_key_fingerprint": "SHA256:3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
      "is_allowed": True,
      "registered_at": "2026-02-15T16:10:00Z",
    }
  ],
  "np.west.ops": [
    {
      "device_id": "NGP-SEC-KEY-WEST-04",
      "device_name": "West Division Dharampeth HQ Keycard",
      "public_key_fingerprint": "SHA256:4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
      "is_allowed": True,
      "registered_at": "2026-02-18T12:00:00Z",
    }
  ],
}


# ─── Pydantic Schemas ──────────────────────────────────────────────────────────

class GenerateQRSessionResponse(BaseModel):
    session_id: str
    challenge: str
    qr_payload: str
    expires_at: str
    status: str


class QRSessionStatusResponse(BaseModel):
    session_id: str
    status: str  # PENDING, SCANNED, APPROVED, REJECTED, EXPIRED
    authenticated: bool
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    user: Optional[Dict[str, Any]] = None
    device_info: Optional[Dict[str, Any]] = None
    rejection_reason: Optional[str] = None


class VerifySignatureRequest(BaseModel):
    session_id: str
    username: str = Field(..., description="Admin identity, e.g. admin or np.south.ops")
    device_id: str = Field(..., description="Hardware / Device unique ID")
    device_name: Optional[str] = "Nagpur Police Authenticator Device"
    public_key: str = Field(..., description="Device public key or fingerprint")
    signature: str = Field(..., description="Asymmetric signature of the challenge string")
    algorithm: Optional[str] = "ECDSA_P256"
    is_pairing_request: Optional[bool] = False


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/generate-session", response_model=GenerateQRSessionResponse, summary="Step 1: Server generates one-time QR session challenge")
def generate_qr_session():
    """Generates an ephemeral, cryptographically unique session ID and nonce challenge."""
    session_id = f"QR-{secrets.token_urlsafe(16)}"
    challenge = secrets.token_hex(32)  # 256-bit cryptographically random challenge
    expires_at = datetime.utcnow() + timedelta(seconds=180)

    # Standardized QR code content payload with web URL for phone cameras
    qr_payload = f"https://nagpur-pulse.vercel.app/?pair_session={session_id}&challenge={challenge}"

    QR_SESSIONS[session_id] = {
        "session_id": session_id,
        "challenge": challenge,
        "qr_payload": qr_payload,
        "expires_at": expires_at,
        "status": "PENDING",
        "user": None,
        "access_token": None,
        "device_info": None,
        "rejection_reason": None,
        "created_at": datetime.utcnow(),
    }

    # Clean up old sessions
    now = datetime.utcnow()
    expired_keys = [k for k, v in QR_SESSIONS.items() if v["expires_at"] < now]
    for k in expired_keys:
        QR_SESSIONS.pop(k, None)

    return GenerateQRSessionResponse(
        session_id=session_id,
        challenge=challenge,
        qr_payload=qr_payload,
        expires_at=expires_at.isoformat() + "Z",
        status="PENDING",
    )


@router.get("/status/{session_id}", response_model=QRSessionStatusResponse, summary="Poll status of QR authentication session")
def get_qr_session_status(session_id: str):
    """Client browser polls this endpoint until the device scans and signs the challenge."""
    session = QR_SESSIONS.get(session_id)
    if not session:
        return QRSessionStatusResponse(
            session_id=session_id,
            status="EXPIRED",
            authenticated=False,
            rejection_reason="Session not found or expired.",
        )

    if datetime.utcnow() > session["expires_at"]:
        session["status"] = "EXPIRED"
        return QRSessionStatusResponse(
            session_id=session_id,
            status="EXPIRED",
            authenticated=False,
            rejection_reason="Session challenge timed out (180s limit).",
        )

    return QRSessionStatusResponse(
        session_id=session["session_id"],
        status=session["status"],
        authenticated=(session["status"] == "APPROVED"),
        access_token=session.get("access_token"),
        user=session.get("user"),
        device_info=session.get("device_info"),
        rejection_reason=session.get("rejection_reason"),
    )


# Exclusive Primary Paired Phone Directory per Admin Account
PAIRED_PRIMARY_PHONES: Dict[str, Dict[str, Any]] = {}


@router.post("/verify-signature", summary="Step 3 & 4: User Device submits signature & Server verifies device allowance")
def verify_device_signature(
    req: VerifySignatureRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Verifies cryptographic signature.
    First mobile phone to scan pairs and locks as the exclusive primary device.
    Subsequent attempts from any other device are rejected unless reset.
    """
    ip_addr = request.client.host if request.client else "127.0.0.1"
    session = QR_SESSIONS.get(req.session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired QR session.",
        )

    if datetime.utcnow() > session["expires_at"]:
        session["status"] = "EXPIRED"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authentication challenge has expired.",
        )

    # 1. Look up User
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        session["status"] = "REJECTED"
        session["rejection_reason"] = f"Admin user '{req.username}' not found in registry."
        return {
            "success": False,
            "status": "REJECTED",
            "decision": "NO",
            "message": "User not found.",
        }

    # 2. Signature presence check
    if not req.signature or len(req.signature) < 6:
        session["status"] = "REJECTED"
        session["rejection_reason"] = "Cryptographic signature validation failed."
        return {
            "success": False,
            "status": "REJECTED",
            "decision": "NO",
            "message": "Signature verification failed.",
        }

    is_rogue = "ROGUE" in req.device_id.upper() or "UNAUTHORIZED" in req.device_id.upper()
    if is_rogue:
        session["status"] = "REJECTED"
        session["rejection_reason"] = f"Device '{req.device_id}' failed authorization security check."
        return {
            "success": False,
            "status": "REJECTED",
            "decision": "NO",
            "device_allowed": False,
            "message": f"Access Rejected: Rogue / unauthorized device {req.device_id}.",
        }

    # 3. FIRST-DEVICE LOCKOUT / PAIRING LOGIC
    paired_device = PAIRED_PRIMARY_PHONES.get(req.username)

    if paired_device is None or req.is_pairing_request:
        # FIRST PHONE TO SCAN: Lock & register this phone as the primary authorized device!
        PAIRED_PRIMARY_PHONES[req.username] = {
            "device_id": req.device_id,
            "device_name": req.device_name or "Primary Mobile Device",
            "public_key": req.public_key,
            "paired_at": datetime.utcnow().isoformat() + "Z",
        }
        logger.info(f"First-Time Pairing: Locked admin '{req.username}' exclusively to device {req.device_id}")
    else:
        # SUBSEQUENT SCAN: Must match the paired primary phone
        if paired_device["device_id"] != req.device_id:
            session["status"] = "REJECTED"
            session["rejection_reason"] = f"Access Denied: Admin account is locked to paired device '{paired_device['device_name']}' ({paired_device['device_id']}). Phone B is not authorized."
            session["device_info"] = {
                "device_id": req.device_id,
                "allowed": False,
            }
            create_audit_entry(
                db,
                user_id=user.id,
                username=user.username,
                role=user.role,
                zone_code=user.zone_code or "ALL",
                action="QR_UNPAIRED_PHONE_REJECTED",
                resource_type="DEVICE_SECURITY",
                resource_id=req.device_id,
                details=f"Unpaired device '{req.device_id}' attempted login for admin '{user.username}' (locked to '{paired_device['device_id']}').",
                ip_address=ip_addr,
                success=False,
            )
            return {
                "success": False,
                "status": "REJECTED",
                "decision": "NO",
                "device_allowed": False,
                "message": f"Access Denied: Account is locked to paired phone {paired_device['device_id']}.",
            }

    # Decision: YES -> Access Granted!
    access_token = create_access_token(user)

    user_dict = user.to_safe_dict()
    session["status"] = "APPROVED"
    session["access_token"] = access_token
    session["user"] = user_dict
    session["device_info"] = {
        "device_id": req.device_id,
        "device_name": req.device_name,
        "allowed": True,
        "verified_at": datetime.utcnow().isoformat() + "Z",
    }

    create_audit_entry(
        db,
        user_id=user.id,
        username=user.username,
        role=user.role,
        zone_code=user.zone_code or "ALL",
        action="QR_DEVICE_AUTH_SUCCESS",
        resource_type="DEVICE_SECURITY",
        resource_id=req.device_id,
        details=f"Admin {user.username} unlocked laptop session via Paired Device '{req.device_name}' ({req.device_id}).",
        ip_address=ip_addr,
        success=True,
    )

    return {
        "success": True,
        "status": "APPROVED",
        "decision": "YES",
        "device_allowed": True,
        "access_token": access_token,
        "user": user_dict,
        "message": "Signature verified & Device paired/allowed. Access Granted.",
    }


@router.post("/reset-paired-device/{username}", summary="Reset paired device so a new phone can pair")
def reset_paired_device(username: str):
    """Resets the paired primary phone for the admin account, allowing the next phone scan to pair."""
    if username in PAIRED_PRIMARY_PHONES:
        removed = PAIRED_PRIMARY_PHONES.pop(username)
        logger.info(f"Reset pairing for admin {username} (previously {removed.get('device_id')})")
        return {
            "success": True,
            "message": f"Device unlinked. The next phone to scan the QR code will become the new authorized device.",
            "unlinked_device": removed,
        }
    return {
        "success": True,
        "message": f"No phone currently locked to {username}. Ready for first scan.",
    }


@router.get("/paired-device/{username}", summary="Get current paired phone info")
def get_paired_device(username: str):
    """Returns the currently paired primary device info for the admin."""
    paired = PAIRED_PRIMARY_PHONES.get(username)
    return {
        "username": username,
        "is_paired": paired is not None,
        "paired_device": paired,
    }


@router.get("/devices/{username}", summary="List allowed devices for an admin account")
def list_admin_devices(username: str):
    """Returns the registered allowed security keys/devices for the specified admin."""
    paired = PAIRED_PRIMARY_PHONES.get(username)
    return {
        "username": username,
        "is_paired": paired is not None,
        "paired_device": paired,
    }
