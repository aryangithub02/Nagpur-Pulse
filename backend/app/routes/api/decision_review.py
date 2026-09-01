"""
Nagpur Pulse — Decision Review Engine REST API Routes.
Provides endpoints for operational assurance evaluation, commander decisions,
post-incident outcome logging, and tamper-evident audit chain verification.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models.decision_evidence import DecisionEvidenceRecord
from app.schemas.decision_review import (
    DecisionReviewEvaluationRequest,
    DecisionReviewEvaluationResponse,
    CommanderDecisionSubmissionSchema,
    OutcomeRecordingSchema,
    DecisionReviewConfigSchema,
)
from app.services.decision_review_service import decision_review_service
from app.routes.api.decisions import get_user_or_fallback

router = APIRouter(prefix="", tags=["Decision Review Engine"])


@router.post(
    "/evaluate",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Evaluate an AI recommendation before commander review"
)
def evaluate_recommendation(
    payload: DecisionReviewEvaluationRequest,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Evaluates an AI recommendation through the 15-step Decision Review pipeline:
    1. Hard Constraints Check (Overrides to BLOCKED if failed)
    2. Normalized 12-Component Parameter Scoring (0-100)
    3. Decision Assurance Score (DAS) Linear Optimization
    4. What-If Penalty Integration
    5. Assurance Status Tiering (ASSURED, REVIEW REQUIRED, LOW ASSURANCE, BLOCKED)
    6. Multi-Unit Alternative Comparative Ranking
    7. Known vs Unknown Conditions Intelligence Disclosures
    8. Cryptographic SHA-256 Tamper-Evident Hash Chaining
    """
    try:
        evaluation = decision_review_service.evaluate_recommendation(
            db=db,
            recommendation_id=payload.recommendation_id,
            incident_id=payload.incident_id,
            location_id=payload.location_id,
            location_name=payload.location_name,
            recommended_unit_id=payload.recommended_unit_id,
            incident_severity=payload.incident_severity,
            incident_type=payload.incident_type,
            required_capabilities=payload.required_capabilities,
            min_sector_coverage_pct=payload.min_sector_coverage_pct,
        )
        return evaluation
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Decision Review evaluation error: {str(e)}"
        )


@router.get(
    "/recent",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="Get recent decision evidence records"
)
def get_recent_decisions(
    limit: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="Filter by assurance status"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """Fetch recent decision evidence records with optional status filtering."""
    query = db.query(DecisionEvidenceRecord).order_by(desc(DecisionEvidenceRecord.id))
    if status_filter:
        query = query.filter(DecisionEvidenceRecord.assurance_status == status_filter.upper())
    records = query.limit(limit).all()
    return [r.to_dict() for r in records]


@router.get(
    "/{decision_id}",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Fetch an immutable decision evidence record by ID"
)
def get_decision_by_id(
    decision_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """Retrieve complete decision evidence record and audit trail."""
    rec = db.query(DecisionEvidenceRecord).filter(DecisionEvidenceRecord.decision_id == decision_id).first()
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision evidence record '{decision_id}' not found."
        )
    return rec.to_dict()


@router.post(
    "/{decision_id}/decision",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Submit commander decision (APPROVE, MODIFY, REJECT)"
)
def submit_commander_decision(
    decision_id: str,
    payload: CommanderDecisionSubmissionSchema,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Submits human commander action:
    - APPROVE: Accepts recommendation, triggers dispatch of recommended unit.
    - MODIFY: Selects alternate unit with mandatory override reason code.
    - REJECT: Rejects recommendation with mandatory operational reason code.
    Updates SHA-256 state digest and appends to immutable AuditLog.
    """
    success, code, result = decision_review_service.record_commander_decision(
        db=db,
        decision_id=decision_id,
        user_info=current_user,
        action=payload.action,
        selected_unit_id=payload.selected_unit_id,
        reason_code=payload.reason_code,
        comment=payload.comment,
    )
    if not success:
        raise HTTPException(status_code=code, detail=result)
    return result


@router.post(
    "/{decision_id}/outcome",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Record actual real-world outcome and failure taxonomy"
)
def record_decision_outcome(
    decision_id: str,
    payload: OutcomeRecordingSchema,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Logs actual incident outcome and assigns failure taxonomy:
    - DATA_FAILURE: Stale GPS/telemetry or invalid inputs.
    - MODEL_FAILURE: Inaccurate risk or severity prediction.
    - RECOMMENDATION_FAILURE: Unviable route or resource assignment.
    - HUMAN_DECISION: Commander override was suboptimal.
    - EXECUTION_FAILURE: On-scene mechanical/communications delay.
    - NONE: Successful nominal resolution.
    """
    success, code, result = decision_review_service.record_actual_outcome(
        db=db,
        decision_id=decision_id,
        user_info=current_user,
        outcome_status=payload.outcome_status,
        failure_classification=payload.failure_classification,
        actual_response_time_minutes=payload.actual_response_time_minutes,
        post_event_evaluation=payload.post_event_evaluation,
    )
    if not success:
        raise HTTPException(status_code=code, detail=result)
    return result


@router.get(
    "/config/weights",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Get configurable DAS weights and thresholds"
)
def get_decision_review_config(
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """Get active DAS component weights, What-If weights, and status thresholds."""
    return decision_review_service.get_config()


@router.put(
    "/config/weights",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Update configurable DAS weights and thresholds"
)
def update_decision_review_config(
    payload: DecisionReviewConfigSchema,
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """Update runtime DAS component weights, What-If weights, and thresholds."""
    return decision_review_service.update_config(payload.model_dump())


@router.get(
    "/audit-chain/verify",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Verify cryptographic integrity of the Decision Evidence SHA-256 Hash Chain"
)
def verify_audit_hash_chain(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Verifies that all decision evidence records form an unbroken SHA-256 cryptographic chain.
    Detects any database tampering, out-of-order mutations, or payload modifications.
    """
    return decision_review_service.verify_audit_chain(db)
