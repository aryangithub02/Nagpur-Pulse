from datetime import datetime
from typing import Optional
from sqlalchemy import String, Integer, DateTime, Text, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DecisionRecord(Base):
    """
    SQLAlchemy ORM Model for Human Decision Records & Audit Trail.
    Permanently captures AI recommendation snapshot, human action (ACCEPT/MODIFY/REJECT),
    override reasons, operator identity, ML model version, and live dispatch status.
    """
    __tablename__ = "decision_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    decision_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    recommendation_id: Mapped[str] = mapped_column(
        ForeignKey("recommendations.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )
    incident_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    location_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("junctions.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Immutably preserves the exact AI recommendation snapshot seen by controller
    previous_recommendation_json: Mapped[str] = mapped_column(Text, nullable=False)

    # Final Human Action: ACCEPT, MODIFY, REJECT
    final_action: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    final_unit_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("police_units.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Reason & Comment for Auditability
    reason_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Authenticated Operator Credentials
    operator_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    operator_username: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    operator_role: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    operator_zone: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    # System & Model Lineage Metadata
    model_version: Mapped[str] = mapped_column(String(100), nullable=False, default="rf_v2_retrained")
    input_snapshot_id: Mapped[str] = mapped_column(String(100), nullable=False, default="SNAP-00127")

    # Operational Decision Status: PENDING, RECORDED, DISPATCHED, NOT_DISPATCHED, FAILED, STALE, CONFLICT
    decision_status: Mapped[str] = mapped_column(String(50), nullable=False, default="RECORDED", index=True)

    # Live Dispatch Tracking
    dispatch_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    dispatch_status: Mapped[str] = mapped_column(String(50), nullable=False, default="NOT_DISPATCHED")

    # Idempotency & Validation Metadata
    idempotency_key: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True, index=True)
    validation_result_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    recommendation: Mapped["Recommendation"] = relationship("Recommendation")
    junction: Mapped[Optional["Junction"]] = relationship("Junction")
    final_unit: Mapped[Optional["PoliceUnit"]] = relationship("PoliceUnit")
    operator: Mapped[Optional["User"]] = relationship("User")

    def to_dict(self):
        import json
        prev_rec = {}
        if self.previous_recommendation_json:
            try:
                prev_rec = json.loads(self.previous_recommendation_json)
            except Exception:
                prev_rec = {"raw": self.previous_recommendation_json}

        return {
            "decision_id": self.decision_id,
            "recommendation_id": self.recommendation_id,
            "incident_id": self.incident_id,
            "location_id": self.location_id,
            "previous_recommendation": prev_rec,
            "action": self.final_action,
            "recommended_unit_id": prev_rec.get("recommended_unit_id"),
            "final_unit_id": self.final_unit_id,
            "reason_code": self.reason_code,
            "comment": self.comment,
            "operator": {
                "id": self.operator_id,
                "username": self.operator_username,
                "role": self.operator_role,
                "zone": self.operator_zone,
            },
            "model_version": self.model_version,
            "input_snapshot_id": self.input_snapshot_id,
            "status": self.decision_status,
            "dispatch": {
                "status": self.dispatch_status,
                "dispatch_id": self.dispatch_id,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
