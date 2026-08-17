from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class TrafficObservation(Base):
    """SQLAlchemy ORM Model for raw traffic data observations at a junction."""
    __tablename__ = "traffic_observations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    junction_id: Mapped[int] = mapped_column(
        ForeignKey("junctions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True
    )
    traffic_data: Mapped[Dict[str, Any]] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship back to Junction
    junction: Mapped["Junction"] = relationship("Junction", back_populates="observations")
