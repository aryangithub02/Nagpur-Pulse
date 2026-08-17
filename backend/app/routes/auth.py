import logging
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.zone import Zone
from app.services.auth_service import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    validate_password_policy,
    create_audit_entry,
    MAX_FAILED_ATTEMPTS,
    LOCKOUT_MINUTES,
)

logger = logging.getLogger("auth_router")
router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

# Pydantic Schemas
class LoginRequest(BaseModel):
    username: str = Field(..., example="admin")
    password: str = Field(..., example="NagpurPulse@2026Admin!")

class LoginResponse(BaseModel):
    authenticated: bool
    access_token: str
    token_type: str = "bearer"
    user: dict

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

# FastAPI Dependency for Extracting Authenticated User
def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> User:
    """Decodes JWT Bearer token and returns active database User object."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication session. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account no longer active or valid.",
        )
        
    # Check if locked
    if user.is_locked:
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account locked due to multiple failed login attempts until {user.locked_until.strftime('%H:%M:%S')}",
            )
        else:
            # Auto-unlock if lockout window expired
            user.is_locked = False
            user.failed_login_attempts = 0
            user.locked_until = None
            db.commit()

    return user

# 1. POST /auth/login
@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip_addr = request.client.host if request.client else "127.0.0.1"
    
    user = db.query(User).filter(User.username == req.username).first()
    
    # Generic error message to prevent username enumeration
    invalid_credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password.",
    )
    
    if not user:
        create_audit_entry(
            db, username=req.username, role="UNKNOWN", action="LOGIN_FAILED",
            details="User not found", ip_address=ip_addr, success=False
        )
        raise invalid_credentials_error

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled. Please contact System Administrator.",
        )

    # Check lockout
    if user.is_locked:
        if user.locked_until and user.locked_until > datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account locked due to 5 failed attempts. Locked until {user.locked_until.strftime('%H:%M:%S')} UTC.",
            )
        else:
            user.is_locked = False
            user.failed_login_attempts = 0
            user.locked_until = None

    # Verify password hash (Argon2id Fast-Path)
    if not verify_password(req.password, user.password_hash, username=user.username):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
            user.is_locked = True
            user.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
            logger.warning(f"Account {user.username} locked due to {MAX_FAILED_ATTEMPTS} failed attempts.")

        db.commit()

        create_audit_entry(
            db, user_id=user.id, username=user.username, role=user.role,
            zone_code=user.zone_code, action="LOGIN_FAILED",
            details=f"Invalid password attempt ({user.failed_login_attempts}/{MAX_FAILED_ATTEMPTS})",
            ip_address=ip_addr, success=False
        )
        raise invalid_credentials_error

    # Login Success
    user.failed_login_attempts = 0
    user.is_locked = False
    user.locked_until = None
    user.last_login_at = datetime.utcnow()
    db.commit()

    token = create_access_token(user)

    create_audit_entry(
        db, user_id=user.id, username=user.username, role=user.role,
        zone_code=user.zone_code, action="LOGIN_SUCCESS",
        details="User logged in successfully", ip_address=ip_addr, success=True
    )

    return {
        "authenticated": True,
        "access_token": token,
        "token_type": "bearer",
        "user": user.to_safe_dict(),
    }

# 2. POST /auth/change-password
@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ip_addr = request.client.host if request.client else "127.0.0.1"

    # Verify current password
    if not verify_password(req.current_password, current_user.password_hash):
        create_audit_entry(
            db, user_id=current_user.id, username=current_user.username,
            role=current_user.role, zone_code=current_user.zone_code,
            action="PASSWORD_CHANGE_FAILED", details="Current password invalid",
            ip_address=ip_addr, success=False
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirmation password do not match.",
        )

    if req.new_password == req.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from current password.",
        )

    # Policy Validation
    is_valid, msg = validate_password_policy(
        req.new_password, username=current_user.username, zone_code=current_user.zone_code or ""
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password Policy Error: {msg}",
        )

    # Hash and Update
    current_user.password_hash = hash_password(req.new_password)
    current_user.must_change_password = False
    current_user.password_changed_at = datetime.utcnow()
    db.commit()

    create_audit_entry(
        db, user_id=current_user.id, username=current_user.username,
        role=current_user.role, zone_code=current_user.zone_code,
        action="PASSWORD_CHANGED", details="Password updated successfully",
        ip_address=ip_addr, success=True
    )

    return {
        "success": True,
        "message": "Password changed successfully.",
        "user": current_user.to_safe_dict(),
    }

# 3. GET /auth/me
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "authenticated": True,
        "user": current_user.to_safe_dict(),
    }

# 4. POST /auth/logout
@router.post("/logout")
def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ip_addr = request.client.host if request.client else "127.0.0.1"
    create_audit_entry(
        db, user_id=current_user.id, username=current_user.username,
        role=current_user.role, zone_code=current_user.zone_code,
        action="LOGOUT", details="User logged out",
        ip_address=ip_addr, success=True
    )
    return {"success": True, "message": "Successfully logged out."}
