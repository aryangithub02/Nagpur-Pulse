from datetime import datetime
from typing import Any, Dict, Optional, List
from sqlalchemy import String, Float, Integer, DateTime, func, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

JSONType = JSONB().with_variant(JSON, "sqlite")


class OptimizationRun(Base):
    """
    SQLAlchemy ORM model storing complete Google OR-Tools CP-SAT resource allocation run results.
    """
    __tablename__ = "optimization_runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    optimization_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    solver: Mapped[str] = mapped_column(String(50), nullable=False, default="Google OR-Tools CP-SAT")
    solver_status: Mapped[str] = mapped_column(String(30), nullable=False, default="OPTIMAL")  # OPTIMAL, FEASIBLE, INFEASIBLE, UNKNOWN
    objective_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    available_units_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    allocated_units_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    unallocated_units_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    total_demand_locations: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    covered_locations_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    uncovered_locations_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    risk_weighted_coverage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # %
    resource_utilization: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)    # %
    resource_shortage_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    solver_time_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    uncovered_locations_json: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONType, nullable=True)
    unallocated_units_json: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSONType, nullable=True)
    configuration_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSONType, nullable=True)

    # Relationship to assignments
    assignments: Mapped[List["AllocationAssignment"]] = relationship(
        "AllocationAssignment", back_populates="optimization_run", cascade="all, delete-orphan"
    )
