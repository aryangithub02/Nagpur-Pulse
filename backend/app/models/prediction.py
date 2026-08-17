from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import String, Float, Boolean, ForeignKey, DateTime, func, JSON, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

JSONType = JSONB().with_variant(JSON, "sqlite")


class Prediction(Base):
    """
    SQLAlchemy ORM Model for ML prediction outputs recorded by the backend in PostgreSQL / SQLite.
    Stores complete Phase 8 risk prediction lifecycle metadata.
    """
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    junction_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("junctions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    junction_id_str: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True
    )
    prediction_time: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )
    
    # Categorical Risk Output & Continuous Risk Score
    prediction: Mapped[str] = mapped_column(String(255), nullable=False)  # Matches risk_level
    risk_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    risk_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Class Probabilities Breakdown
    probability_low: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    probability_medium: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    probability_high: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    probability_critical: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    # Model Metadata
    model_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="RandomForest")
    model_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="rf_v1")
    feature_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, default="features_v1")
    
    is_mock: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True, default=False)
    features_used: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONType, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationship back to Junction
    junction: Mapped[Optional["Junction"]] = relationship("Junction", back_populates="predictions")


# Composite index for rapid historical queries
Index("idx_predictions_junction_timestamp", Prediction.junction_id, Prediction.timestamp.desc())
