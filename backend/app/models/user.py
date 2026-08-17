import enum
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class UserRole(str, enum.Enum):
    SYSTEM_ADMIN = "SYSTEM_ADMIN"
    ZONE_ADMIN = "ZONE_ADMIN"
    DISPATCHER = "DISPATCHER"
    FIELD_OFFICER = "FIELD_OFFICER"
    ANALYST = "ANALYST"
    VIEWER = "VIEWER"

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default=UserRole.VIEWER.value)
    zone_id: Mapped[Optional[int]] = mapped_column(ForeignKey("zones.id"), nullable=True, index=True)
    zone_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    failed_login_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    locked_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    must_change_password: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    password_changed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    zone = relationship("Zone", foreign_keys=[zone_id])

    def to_safe_dict(self):
        """Returns safe user object payload WITHOUT password or sensitive hashes."""
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "zone_id": self.zone_id,
            "zone": self.zone_code or (self.zone.code if self.zone else "ALL"),
            "is_active": self.is_active,
            "is_locked": self.is_locked,
            "must_change_password": self.must_change_password,
            "password_changed_at": self.password_changed_at.isoformat() if self.password_changed_at else None,
            "last_login_at": self.last_login_at.isoformat() if self.last_login_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
