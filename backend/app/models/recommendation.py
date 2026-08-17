from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Recommendation(Base):
    """SQLAlchemy ORM Model for police deployment recommendations."""
    __tablename__ = "recommendations"

    id: Mapped[str] = mapped_column(String(100), primary_key=True, index=True)
    location_id: Mapped[int] = mapped_column(
        ForeignKey("junctions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    unit_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("police_units.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    priority: Mapped[str] = mapped_column(String(50), nullable=False, default="MEDIUM")
    estimated_distance: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    estimated_time: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING", index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    junction: Mapped["Junction"] = relationship("Junction")
    unit: Mapped[Optional["PoliceUnit"]] = relationship("PoliceUnit")
