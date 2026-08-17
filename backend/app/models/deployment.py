from datetime import datetime
from typing import Optional
from sqlalchemy import String, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Deployment(Base):
    """SQLAlchemy ORM Model for active police unit deployments."""
    __tablename__ = "deployments"

    id: Mapped[str] = mapped_column(String(100), primary_key=True, index=True)
    unit_id: Mapped[str] = mapped_column(
        ForeignKey("police_units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    location_id: Mapped[int] = mapped_column(
        ForeignKey("junctions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recommendation_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("recommendations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="ACTIVE", index=True)
    deployed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    unit: Mapped["PoliceUnit"] = relationship("PoliceUnit")
    junction: Mapped["Junction"] = relationship("Junction")
    recommendation: Mapped[Optional["Recommendation"]] = relationship("Recommendation")
