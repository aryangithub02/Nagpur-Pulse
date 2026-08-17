from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import String, Float, Boolean, ForeignKey, DateTime, func, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

JSONType = JSONB().with_variant(JSON, "sqlite")


class Prediction(Base):
    """SQLAlchemy ORM Model for ML prediction outputs recorded by the backend."""
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    junction_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("junctions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True
    )
    prediction: Mapped[str] = mapped_column(String(255), nullable=False)
    probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    is_mock: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True, default=False)
    features_used: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship back to Junction
    junction: Mapped[Optional["Junction"]] = relationship("Junction", back_populates="predictions")
