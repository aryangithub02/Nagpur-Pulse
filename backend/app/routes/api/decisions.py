"""
Nagpur Pulse - Human Decision Record & Audit Trail API Endpoints.
Enforces auditable Human-in-the-Loop workflows for AI deployment recommendations.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.decision_service import DecisionService
from app.services.audit_service import AuditService
from app.services.auth_service import decode_access_token
from app.models.user import User

router = APIRouter(prefix="", tags=["Human Decision Record & Audit Trail"])


def get_user_or_fallback(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Helper retrieving authenticated user context or falling back to default Central Ops."""
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and payload.get("user_id"):
            u = db.query(User).filter(User.id == payload.get("user_id")).first()
            if u:
                return {
                    "user_id": u.id,
                    "username": u.username,
                    "role": u.role,
                    "zone": u.zone_code or "CENTRAL"
                }
    return {
        "user_id": 1,
        "username": "np.central.ops",
        "role": "ZONE_ADMIN",
        "zone": "CENTRAL"
    }


class DecisionSubmissionSchema(BaseModel):
    action: str = Field(..., description="Decision action: ACCEPT, MODIFY, REJECT")
    selected_unit_id: Optional[str] = Field(None, description="Selected police unit ID (required for MODIFY)")
    reason_code: Optional[str] = Field(None, description="Reason code (required for MODIFY & REJECT)")
    comment: Optional[str] = Field(None, description="Optional text comment (required if reason_code is OTHER)")


@router.post("/recommendations/{recommendation_id}/decision", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def submit_recommendation_decision(
    recommendation_id: str,
    payload: DecisionSubmissionSchema,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Submits human controller decision (ACCEPT, MODIFY, REJECT) for an AI deployment recommendation.
    Records immutable AI snapshot, human override reason, authenticated operator identity, and triggers live dispatch if accepted/modified.
    """
    success, status_code, result = DecisionService.record_decision(
        db=db,
        user_info=current_user,
        recommendation_id=recommendation_id,
        action=payload.action,
        selected_unit_id=payload.selected_unit_id,
        reason_code=payload.reason_code,
        comment=payload.comment,
        idempotency_key=idempotency_key,
    )

    if not success:
        raise HTTPException(
            status_code=status_code,
            detail=result
        )

    return result


@router.get("/recommendations/decisions/history", response_model=List[Dict[str, Any]])
def list_decision_history(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """Retrieves paginated decision history filtered by operator zone authorization."""
    user_zone = current_user.get("zone", "ALL")
    return DecisionService.get_decision_history(db, user_zone=user_zone, limit=limit)


@router.get("/recommendations/decisions/{decision_id}", response_model=Dict[str, Any])
def get_decision_details(
    decision_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """Retrieves full decision record details including AI recommendation snapshot and dispatch status."""
    decision = DecisionService.get_decision_by_id(db, decision_id)
    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision record '{decision_id}' not found."
        )

    # Enforce zone scoping
    user_zone = current_user.get("zone", "ALL")
    user_role = current_user.get("role", "ZONE_ADMIN")
    rec_zone = decision.get("operator", {}).get("zone", "CENTRAL")

    if user_role != "SYSTEM_ADMIN" and user_zone != "ALL" and user_zone != rec_zone:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Operator in zone '{user_zone}' is not authorized to view decision record from zone '{rec_zone}'."
        )

    return decision


@router.get("/audit/logs", response_model=List[Dict[str, Any]])
def list_audit_logs(
    action: Optional[str] = Query(None, description="Action filter (e.g. DECISION_ACCEPTED)"),
    search: Optional[str] = Query(None, description="Free text search query"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """Retrieves paginated append-only audit event logs filtered by authorized zone."""
    user_zone = current_user.get("zone", "ALL")
    return AuditService.get_audit_logs(
        db=db,
        user_zone=user_zone,
        action_filter=action,
        search_query=search,
        limit=limit,
        offset=offset
    )


@router.get("/audit/analytics", response_model=Dict[str, Any])
def get_human_override_analytics(
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """Retrieves Human Override Analytics & AI-Human Agreement metrics for authorized zone."""
    user_zone = current_user.get("zone", "ALL")
    return AuditService.get_human_override_analytics(db=db, user_zone=user_zone)


# ---------------------------------------------------------------------------
# INLINE DECISION — creates Recommendation record automatically, then records
# the human decision. Used when the allocation engine returns assignments that
# are NOT backed by a DB Recommendation (e.g. FastAllocationService results).
# ---------------------------------------------------------------------------

class InlineDecisionSchema(BaseModel):
    # What the AI recommended
    unit_id: str = Field(..., description="AI-recommended police unit ID")
    location_id: int = Field(..., description="Target junction/location ID")
    location_name: str = Field("", description="Human-readable location name")
    reason: str = Field("HIGH_RISK_SURGE", description="AI recommendation reason text")
    priority: str = Field("HIGH", description="Priority code: LOW/MEDIUM/HIGH/CRITICAL")
    risk_score: float = Field(50.0, description="Risk score (0-100)")
    eta_minutes: float = Field(5.0, description="Estimated ETA in minutes")
    distance_km: float = Field(2.0, description="Estimated distance in km")

    # Human decision
    action: str = Field(..., description="ACCEPT | MODIFY | REJECT")
    selected_unit_id: Optional[str] = Field(None, description="Controller-chosen unit (MODIFY)")
    reason_code: Optional[str] = Field(None, description="Mandatory for MODIFY & REJECT")
    comment: Optional[str] = Field(None, description="Free text override reason")

    # Optional source metadata
    algorithm: str = Field("GREEDY_PRIORITY", description="Algorithm that generated the recommendation")
    model_version: str = Field("rf_v2_retrained", description="ML model version")


@router.post("/decisions/inline", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def submit_inline_decision(
    payload: InlineDecisionSchema,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Creates a Recommendation record inline from allocation data, then records the
    human ACCEPT / MODIFY / REJECT decision in one atomic transaction.
    Designed for Fast Allocation results that don't have a pre-existing Recommendation row.
    Prevents duplicate decisions for the same unit+location combination.
    """
    import uuid, json
    from datetime import datetime
    from app.models.recommendation import Recommendation
    from app.models.decision_record import DecisionRecord
    from app.models.audit_log import AuditLog
    from app.models.police_unit import PoliceUnit
    from app.models.deployment import Deployment

    action = payload.action.upper()
    if action not in {"ACCEPT", "MODIFY", "REJECT"}:
        raise HTTPException(status_code=422, detail=f"Invalid action '{action}'. Must be ACCEPT, MODIFY, or REJECT.")

    if action in ("MODIFY", "REJECT") and not payload.reason_code:
        raise HTTPException(status_code=422, detail="reason_code is mandatory for MODIFY and REJECT actions.")

    # Validate reason codes
    VALID_MODIFY_REASONS = {
        "LOCAL_OPERATIONAL_CONDITION", "UNIT_ALREADY_DEPLOYED", "BETTER_LOCAL_UNIT",
        "ROAD_ACCESS_CONSTRAINT", "UNIT_CAPABILITY", "CURRENT_UNIT_UNAVAILABLE",
        "TRAFFIC_CONDITION", "INCIDENT_ESCALATION", "INCIDENT_DEESCALATION",
        "COMMANDER_INSTRUCTION", "OTHER"
    }
    VALID_REJECT_REASONS = {
        "NO_LONGER_REQUIRED", "INCIDENT_RESOLVED", "INSUFFICIENT_INFORMATION",
        "LOCAL_OPERATIONAL_CONDITION", "UNIT_UNAVAILABLE", "DUPLICATE_INCIDENT",
        "ALTERNATIVE_RESPONSE", "OTHER"
    }
    if action == "MODIFY" and payload.reason_code not in VALID_MODIFY_REASONS:
        raise HTTPException(status_code=422, detail=f"Invalid reason code '{payload.reason_code}' for MODIFY.")
    if action == "REJECT" and payload.reason_code not in VALID_REJECT_REASONS:
        raise HTTPException(status_code=422, detail=f"Invalid reason code '{payload.reason_code}' for REJECT.")
    if payload.reason_code == "OTHER" and not (payload.comment and payload.comment.strip()):
        raise HTTPException(status_code=422, detail="Comment is mandatory when reason code is OTHER.")

    username = current_user.get("username", "system")
    operator_role = current_user.get("role", "ZONE_ADMIN")
    operator_zone = current_user.get("zone", "CENTRAL")
    user_id = current_user.get("user_id")

    # Check for existing decision for this unit+location combination to prevent duplicates
    existing_decision = db.query(DecisionRecord).join(Recommendation).filter(
        Recommendation.unit_id == payload.unit_id,
        Recommendation.location_id == payload.location_id
    ).first()
    if existing_decision:
        raise HTTPException(
            status_code=409,
            detail={
                "error": "DECISION_ALREADY_EXISTS",
                "message": f"A decision for unit '{payload.unit_id}' at location '{payload.location_id}' already exists (decision ID: {existing_decision.decision_id}).",
                "existing_decision_id": existing_decision.decision_id,
            }
        )

    # 1. Auto-create a Recommendation record from the inline data
    rec_id = f"REC-{uuid.uuid4().hex[:10].upper()}"
    now = datetime.utcnow()

    final_unit = payload.selected_unit_id if action == "MODIFY" else (payload.unit_id if action == "ACCEPT" else None)

    # Validate unit exists and is available if dispatching
    if action in ("ACCEPT", "MODIFY") and final_unit:
        unit_obj = db.query(PoliceUnit).filter(PoliceUnit.id == final_unit).first()
        if not unit_obj:
            raise HTTPException(status_code=404, detail=f"Police unit '{final_unit}' not found.")
        # Only AVAILABLE or PATROLLING units can be dispatched
        if unit_obj.status not in ("AVAILABLE", "PATROLLING"):
            raise HTTPException(
                status_code=409,
                detail=f"Unit '{final_unit}' has status '{unit_obj.status}' and is unavailable for dispatch."
            )

    rec = Recommendation(
        id=rec_id,
        location_id=payload.location_id,
        unit_id=payload.unit_id,
        reason=payload.reason or "HIGH_RISK_SURGE",
        priority=payload.priority,
        estimated_distance=payload.distance_km,
        estimated_time=payload.eta_minutes,
        status="PENDING",
        created_at=now,
        updated_at=now,
    )
    db.add(rec)

    # 2. Build AI snapshot
    ai_snapshot = {
        "recommendation_id": rec_id,
        "recommended_unit_id": payload.unit_id,
        "target_location_id": payload.location_id,
        "target_location_name": payload.location_name,
        "reason": payload.reason,
        "priority": payload.priority,
        "risk_score": payload.risk_score,
        "estimated_distance_km": payload.distance_km,
        "estimated_time_min": payload.eta_minutes,
        "algorithm": payload.algorithm,
        "model_version": payload.model_version,
    }

    # 3. Build DecisionRecord
    dec_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
    decision_rec = DecisionRecord(
        decision_id=dec_id,
        recommendation_id=rec_id,
        incident_id=None,
        location_id=payload.location_id,
        previous_recommendation_json=json.dumps(ai_snapshot),
        final_action=action,
        final_unit_id=final_unit if action != "REJECT" else None,
        reason_code=payload.reason_code,
        comment=payload.comment,
        operator_id=user_id,
        operator_username=username,
        operator_role=operator_role,
        operator_zone=operator_zone,
        model_version=payload.model_version,
        input_snapshot_id="INLINE",
        decision_status="RECORDED",
        dispatch_status="NOT_DISPATCHED",
        created_at=now,
        updated_at=now,
    )
    db.add(decision_rec)

    # 4. Audit log entry
    audit_action = f"DECISION_{action}"
    audit_entry = AuditLog(
        user_id=user_id,
        username=username,
        role=operator_role,
        zone_code=operator_zone,
        action=audit_action,
        resource_type="INLINE_DECISION",
        resource_id=dec_id,
        details=(
            f"Controller {username} [{operator_role}] executed {action} on AI recommendation "
            f"Unit {payload.unit_id} → {payload.location_name} (Risk: {payload.risk_score:.0f}, ETA: {payload.eta_minutes:.1f}min). "
            + (f"Override unit: {payload.selected_unit_id}. " if payload.selected_unit_id else "")
            + (f"Reason: {payload.reason_code}." if payload.reason_code else "")
        ),
        old_value=json.dumps({"unit_id": payload.unit_id, "location_id": payload.location_id}),
        new_value=json.dumps({"action": action, "final_unit_id": final_unit, "reason_code": payload.reason_code}),
        timestamp=now,
        success=True,
    )
    db.add(audit_entry)

    # 5. Update recommendation and deployment status
    if action in ("ACCEPT", "MODIFY"):
        rec.status = "ACCEPTED" if action == "ACCEPT" else "MODIFIED"
        if action == "MODIFY" and final_unit:
            rec.unit_id = final_unit
        rec.updated_at = now

        # Create active Deployment record
        dep_id = f"dep_{int(now.timestamp())}_{final_unit}"
        deployment = Deployment(
            id=dep_id,
            unit_id=final_unit,
            location_id=payload.location_id,
            recommendation_id=rec_id,
            status="ACTIVE",
            deployed_at=now,
        )
        db.add(deployment)

        decision_rec.dispatch_id = dep_id
        decision_rec.dispatch_status = "DISPATCHED"
        decision_rec.decision_status = "DISPATCHED"

        # Update police unit status to DEPLOYED
        if final_unit:
            u = db.query(PoliceUnit).filter(PoliceUnit.id == final_unit).first()
            if u:
                u.status = "DEPLOYED"
                u.updated_at = now
    else:
        rec.status = "REJECTED"
        rec.updated_at = now
        decision_rec.dispatch_status = "NOT_DISPATCHED"
        decision_rec.decision_status = "RECORDED"

    try:
        db.commit()
        db.refresh(decision_rec)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save decision: {e}")

    return decision_rec.to_dict()
