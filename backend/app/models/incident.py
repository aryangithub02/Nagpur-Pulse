from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Incident(Base):
    """SQLAlchemy ORM Model for traffic and safety incidents in Nagpur."""
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(100), primary_key=True, index=True)
    location_id: Mapped[int] = mapped_column(
        ForeignKey("junctions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True
    )
    type: Mapped[str] = mapped_column(String(100), nullable=False, default="ACCIDENT")
    severity: Mapped[str] = mapped_column(String(50), nullable=False, default="MEDIUM")
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE")
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship back to Junction
    junction: Mapped["Junction"] = relationship("Junction")
