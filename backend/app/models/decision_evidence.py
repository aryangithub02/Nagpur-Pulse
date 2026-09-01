from datetime import datetime
import json
import hashlib
from typing import Optional, Dict, Any, List
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class DecisionEvidenceRecord(Base):
    """
    SQLAlchemy ORM Model for Immutable Decision Evidence Records.
    Captures:
    - AI Recommendation Snapshot & ML Risk Score
    - 5-Point Hard Constraint Status
    - Normalized 12-Component Decision Assurance Score (DAS)
    - What-If Simulation Penalty & Secondary Consequences
    - Assurance Status (ASSURED, REVIEW REQUIRED, LOW ASSURANCE, BLOCKED)
    - Alternative Unit Rankings & Delta Analysis
    - Known vs Unknown Intelligence Disclosures
    - Commander Decision (APPROVE, MODIFY, REJECT) & Override Rationale
    - Live Dispatched Unit & Final Outcome
    - 5-Tier Failure Taxonomy Classification (DATA, MODEL, RECOMMENDATION, HUMAN, EXECUTION)
    - Cryptographic SHA-256 Tamper-Evident Hash Chain
    """
    __tablename__ = "decision_evidence_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    decision_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    incident_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    recommendation_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    location_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("junctions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    location_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # ML & Context Metadata
    model_version: Mapped[str] = mapped_column(String(100), nullable=False, default="xgb_smote_weighted_threshold_v3")
    input_snapshot_id: Mapped[str] = mapped_column(String(100), nullable=False, default="SNAP-LIVE")
    api_freshness_seconds: Mapped[float] = mapped_column(Float, nullable=False, default=12.0)
    data_reliability_score: Mapped[float] = mapped_column(Float, nullable=False, default=94.0)
    ml_confidence_score: Mapped[float] = mapped_column(Float, nullable=False, default=91.0)
    ml_risk_score: Mapped[float] = mapped_column(Float, nullable=False, default=75.0)
    ml_risk_tier: Mapped[str] = mapped_column(String(50), nullable=False, default="CRITICAL")

    # Recommended Unit Details
    recommended_unit_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    recommended_unit_callsign: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    estimated_eta_minutes: Mapped[float] = mapped_column(Float, nullable=False, default=4.0)
    estimated_distance_km: Mapped[float] = mapped_column(Float, nullable=False, default=2.5)

    # Step 1: Hard Constraints
    hard_constraints_passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    hard_constraint_violations_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    # Step 2 & 3: Normalized Parameters & Decision Assurance Score (DAS)
    das_components_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    raw_das_score: Mapped[float] = mapped_column(Float, nullable=False, default=88.0)

    # Step 4: What-If Penalty & Secondary Consequences
    what_if_penalty: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    what_if_details_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    coverage_impact_pct: Mapped[float] = mapped_column(Float, nullable=False, default=-4.0)
    final_assurance_score: Mapped[float] = mapped_column(Float, nullable=False, default=88.0)

    # Step 5: Assurance Status (ASSURED, REVIEW REQUIRED, LOW ASSURANCE, BLOCKED)
    assurance_status: Mapped[str] = mapped_column(String(50), nullable=False, default="ASSURED", index=True)
    assurance_narrative: Mapped[str] = mapped_column(Text, nullable=False, default="")

    # Step 6: Multi-Criteria Alternative Units
    alternatives_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    # Step 7: Known vs Unknown Operational Intelligence Matrix
    known_conditions_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    unknown_conditions_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")

    # Step 8: Commander Decision & Override
    commander_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    commander_username: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    commander_role: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    commander_zone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    commander_action: Mapped[str] = mapped_column(String(50), nullable=False, default="PENDING_REVIEW", index=True)
    override_reason: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    commander_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    final_dispatched_unit_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    decision_timestamp: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Step 9 & 10: Actual Outcome & Failure Taxonomy
    actual_outcome_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # SUCCESS, DELAYED, ESCALATED, RESOLVED
    failure_classification: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # DATA_FAILURE, MODEL_FAILURE, RECOMMENDATION_FAILURE, HUMAN_DECISION, EXECUTION_FAILURE, NONE
    actual_response_time_minutes: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    post_event_evaluation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    outcome_recorded_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Step 11: Cryptographic Tamper-Evident SHA-256 Hash Chain
    previous_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="0" * 64)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False, default="")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    junction: Mapped[Optional["Junction"]] = relationship("Junction")
    commander: Mapped[Optional["User"]] = relationship("User")

    def compute_sha256(self) -> str:
        """Computes deterministic SHA-256 digest over immutable evaluation state components."""
        payload = {
            "decision_id": str(self.decision_id or ""),
            "incident_id": str(self.incident_id or ""),
            "recommended_unit_id": str(self.recommended_unit_id or ""),
            "final_assurance_score": float(self.final_assurance_score or 0.0),
            "assurance_status": str(self.assurance_status or ""),
            "previous_hash": str(self.previous_hash or "0" * 64),
        }
        raw_str = json.dumps(payload, sort_keys=True)
        return hashlib.sha256(raw_str.encode("utf-8")).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        """Convert ORM model to dictionary with parsed JSON fields."""
        def parse_j(val: str, default: Any) -> Any:
            if not val:
                return default
            try:
                return json.loads(val)
            except Exception:
                return default

        return {
            "decision_id": self.decision_id,
            "incident_id": self.incident_id,
            "recommendation_id": self.recommendation_id,
            "location_id": self.location_id,
            "location_name": self.location_name,
            "model_version": self.model_version,
            "input_snapshot_id": self.input_snapshot_id,
            "api_freshness_seconds": self.api_freshness_seconds,
            "data_reliability_score": self.data_reliability_score,
            "ml_confidence_score": self.ml_confidence_score,
            "ml_risk_score": self.ml_risk_score,
            "ml_risk_tier": self.ml_risk_tier,
            "recommended_unit": {
                "unit_id": self.recommended_unit_id,
                "callsign": self.recommended_unit_callsign,
                "eta_minutes": self.estimated_eta_minutes,
                "distance_km": self.estimated_distance_km,
            },
            "hard_constraints": {
                "passed": self.hard_constraints_passed,
                "violations": parse_j(self.hard_constraint_violations_json, []),
            },
            "das_components": parse_j(self.das_components_json, {}),
            "raw_das_score": self.raw_das_score,
            "what_if": {
                "penalty": self.what_if_penalty,
                "coverage_impact_pct": self.coverage_impact_pct,
                "details": parse_j(self.what_if_details_json, {}),
            },
            "final_assurance_score": self.final_assurance_score,
            "assurance_status": self.assurance_status,
            "assurance_narrative": self.assurance_narrative,
            "alternatives": parse_j(self.alternatives_json, []),
            "known_conditions": parse_j(self.known_conditions_json, []),
            "unknown_conditions": parse_j(self.unknown_conditions_json, []),
            "commander": {
                "id": self.commander_id,
                "username": self.commander_username,
                "role": self.commander_role,
                "zone": self.commander_zone,
                "action": self.commander_action,
                "override_reason": self.override_reason,
                "notes": self.commander_notes,
                "final_dispatched_unit_id": self.final_dispatched_unit_id,
                "decision_timestamp": self.decision_timestamp.isoformat() if self.decision_timestamp else None,
            },
            "outcome": {
                "status": self.actual_outcome_status,
                "failure_classification": self.failure_classification,
                "actual_response_time_minutes": self.actual_response_time_minutes,
                "post_event_evaluation": self.post_event_evaluation,
                "recorded_at": self.outcome_recorded_at.isoformat() if self.outcome_recorded_at else None,
            },
            "audit_chain": {
                "sha256_hash": self.sha256_hash,
                "previous_hash": self.previous_hash,
            },
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
