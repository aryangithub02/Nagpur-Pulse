from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class PoliceUnit(Base):
    """SQLAlchemy ORM Model for Nagpur Traffic Police response units."""
    __tablename__ = "police_units"

    id: Mapped[str] = mapped_column(String(100), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    badge_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    unit_type: Mapped[str] = mapped_column(String(100), nullable=False, default="PATROL")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="AVAILABLE", index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
