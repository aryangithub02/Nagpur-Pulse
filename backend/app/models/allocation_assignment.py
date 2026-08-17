from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class AllocationAssignment(Base):
    """
    SQLAlchemy ORM model storing individual unit-to-location assignments produced by OR-Tools CP-SAT.
    """
    __tablename__ = "allocation_assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    optimization_id: Mapped[str] = mapped_column(
        String(50), ForeignKey("optimization_runs.optimization_id", ondelete="CASCADE"), nullable=False, index=True
    )

    unit_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    location_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    location_name: Mapped[str] = mapped_column(String(150), nullable=False)

    risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    risk_class: Mapped[str] = mapped_column(String(30), nullable=False, default="LOW")

    traffic_congestion_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    incident_priority_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    coverage_gap_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    eta_minutes: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    assignment_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    status: Mapped[str] = mapped_column(String(30), nullable=False, default="RECOMMENDED")  # RECOMMENDED, ACCEPTED, DISPATCHED, REJECTED
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)

    # Relationship back to OptimizationRun
    optimization_run: Mapped["OptimizationRun"] = relationship("OptimizationRun", back_populates="assignments")
