from datetime import datetime
from typing import Any, Dict, Optional, List
from sqlalchemy import String, Float, Integer, DateTime, Boolean, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

JSONType = JSONB().with_variant(JSON, "sqlite")


class SimulationRun(Base):
    """
    SQLAlchemy ORM model storing read-only What-If Resource Simulation runs.
    Guarantees that live_state_modified is always False.
    """
    __tablename__ = "simulation_runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True, autoincrement=True)
    simulation_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    base_snapshot_id: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    created_by: Mapped[str] = mapped_column(String(100), nullable=False, default="system")
    zone_code: Mapped[str] = mapped_column(String(20), nullable=False, default="ALL")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    status: Mapped[str] = mapped_column(String(30), nullable=False, default="COMPLETED") # COMPLETED, INFEASIBLE, FAILED, INVALID_SCENARIO
    solver_status: Mapped[str] = mapped_column(String(30), nullable=False, default="OPTIMAL")
    objective_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    coverage_before: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    coverage_after: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    risk_weighted_coverage_before: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    risk_weighted_coverage_after: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    scenario_json: Mapped[Dict[str, Any]] = mapped_column(JSONType, nullable=False, default=dict)
    result_json: Mapped[Dict[str, Any]] = mapped_column(JSONType, nullable=False, default=dict)
    live_state_modified: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
