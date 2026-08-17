import json
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.decision_record import DecisionRecord
from app.models.recommendation import Recommendation
from app.models.police_unit import PoliceUnit
from app.models.incident import Incident
from app.models.junction import Junction
from app.models.audit_log import AuditLog
from app.services.deployment_service import DeploymentService
from app.services.auth_service import create_audit_entry

logger = logging.getLogger("decision_service")

# Allowed Decision Actions
VALID_ACTIONS = {"ACCEPT", "MODIFY", "REJECT"}

# Valid Modify Reason Codes
VALID_MODIFY_REASONS = {
    "LOCAL_OPERATIONAL_CONDITION",
    "UNIT_ALREADY_DEPLOYED",
    "BETTER_LOCAL_UNIT",
    "ROAD_ACCESS_CONSTRAINT",
    "UNIT_CAPABILITY",
    "CURRENT_UNIT_UNAVAILABLE",
    "TRAFFIC_CONDITION",
    "INCIDENT_ESCALATION",
    "INCIDENT_DEESCALATION",
    "COMMANDER_INSTRUCTION",
    "OTHER",
}

# Valid Reject Reason Codes
VALID_REJECT_REASONS = {
    "NO_LONGER_REQUIRED",
    "INCIDENT_RESOLVED",
    "INSUFFICIENT_INFORMATION",
    "LOCAL_OPERATIONAL_CONDITION",
    "UNIT_UNAVAILABLE",
    "DUPLICATE_INCIDENT",
    "ALTERNATIVE_RESPONSE",
    "OTHER",
}


class DecisionService:
    """
    Human-in-the-Loop Decision & Audit Trail Service.
    Enforces accountability: AI Recommends -> Human Reviews -> Accept/Modify/Reject -> Decision Record -> Audit -> Live Dispatch.
    """

    @staticmethod
    def record_decision(
        db: Session,
        user_info: Dict[str, Any],
        recommendation_id: str,
        action: str,
        selected_unit_id: Optional[str] = None,
        reason_code: Optional[str] = None,
        comment: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> Tuple[bool, int, Dict[str, Any]]:
        """
        Processes human controller decision on an AI recommendation.
        Returns (success, status_code, payload_or_error_dict).
        """
        action = action.upper() if action else ""
        if action not in VALID_ACTIONS:
            return False, 422, {
                "error": "INVALID_DECISION_ACTION",
                "message": f"Action '{action}' is invalid. Allowed values: ACCEPT, MODIFY, REJECT."
            }

        # 1. Idempotency Check
        if idempotency_key:
            existing_key = db.query(DecisionRecord).filter(DecisionRecord.idempotency_key == idempotency_key).first()
            if existing_key:
                logger.info(f"Returning cached idempotent decision for key '{idempotency_key}'")
                return True, 200, existing_key.to_dict()

        # 2. Authenticated Operator Credentials
        username = user_info.get("username", "system")
        operator_role = user_info.get("role", "ZONE_ADMIN")
        operator_zone = user_info.get("zone", "CENTRAL")
        user_id = user_info.get("user_id")

        # 3. Load Target AI Recommendation
        rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
        if not rec:
            return False, 404, {
                "error": "RECOMMENDATION_NOT_FOUND",
                "message": f"AI Recommendation '{recommendation_id}' does not exist."
            }

        # 4. Duplicate Decision Check
        existing_decision = db.query(DecisionRecord).filter(DecisionRecord.recommendation_id == recommendation_id).first()
        if existing_decision:
            return False, 409, {
                "error": "RECOMMENDATION_ALREADY_DECIDED",
                "recommendation_id": recommendation_id,
                "existing_decision_id": existing_decision.decision_id,
                "message": f"Recommendation '{recommendation_id}' was already decided under decision ID '{existing_decision.decision_id}'."
            }

        # 5. Zone Authorization Check
        target_zone = "CENTRAL"
        if rec.junction and hasattr(rec.junction, "zone_code"):
            target_zone = getattr(rec.junction, "zone_code", "CENTRAL") or "CENTRAL"

        if operator_role != "SYSTEM_ADMIN" and operator_zone != "ALL" and operator_zone != target_zone:
            return False, 403, {
                "error": "ZONE_ACCESS_DENIED",
                "message": f"Operator in zone '{operator_zone}' is not authorized to decide recommendations in zone '{target_zone}'."
            }

        # 6. Recommendation Freshness Check (STALE Check)
        if rec.status in ("COMPLETED", "CLOSED", "CANCELLED", "EXPIRED"):
            return False, 409, {
                "error": "RECOMMENDATION_STALE",
                "message": f"Recommendation '{recommendation_id}' is stale/inactive (status: '{rec.status}')."
            }

        # 7. Reason & Comment Validation
        if action == "MODIFY":
            if not reason_code:
                return False, 422, {
                    "error": "REASON_REQUIRED",
                    "message": "Reason code is mandatory for MODIFY actions."
                }
            if reason_code not in VALID_MODIFY_REASONS:
                return False, 422, {
                    "error": "INVALID_REASON_CODE",
                    "message": f"Invalid reason code '{reason_code}'. Allowed: {sorted(list(VALID_MODIFY_REASONS))}"
                }
            if reason_code == "OTHER" and not (comment and comment.strip()):
                return False, 422, {
                    "error": "COMMENT_REQUIRED_FOR_OTHER",
                    "message": "Comment is mandatory when reason code is OTHER."
                }
            if not selected_unit_id:
                return False, 422, {
                    "error": "SELECTED_UNIT_REQUIRED",
                    "message": "Target police unit ID must be specified for MODIFY action."
                }

        elif action == "REJECT":
            if not reason_code:
                return False, 422, {
                    "error": "REASON_REQUIRED",
                    "message": "Reason code is mandatory for REJECT actions."
                }
            if reason_code not in VALID_REJECT_REASONS:
                return False, 422, {
                    "error": "INVALID_REASON_CODE",
                    "message": f"Invalid reason code '{reason_code}'. Allowed: {sorted(list(VALID_REJECT_REASONS))}"
                }
            if reason_code == "OTHER" and not (comment and comment.strip()):
                return False, 422, {
                    "error": "COMMENT_REQUIRED_FOR_OTHER",
                    "message": "Comment is mandatory when reason code is OTHER."
                }

        # 8. Unit Selection & Live State Revalidation for ACCEPT / MODIFY
        final_unit_id = None
        if action == "ACCEPT":
            final_unit_id = rec.unit_id or selected_unit_id
            if not final_unit_id:
                return False, 422, {
                    "error": "NO_RECOMMENDED_UNIT",
                    "message": "Recommendation does not specify a recommended unit ID."
                }
        elif action == "MODIFY":
            final_unit_id = selected_unit_id

        # Validate Selected Unit Existence & Availability if dispatching
        if action in ("ACCEPT", "MODIFY"):
            target_unit = db.query(PoliceUnit).filter(PoliceUnit.id == final_unit_id).first()
            if not target_unit:
                return False, 404, {
                    "error": "UNIT_NOT_FOUND",
                    "message": f"Police unit '{final_unit_id}' does not exist."
                }
            # Only AVAILABLE or PATROLLING units can be dispatched (DISPATCHED is already deployed)
            if target_unit.status not in ("AVAILABLE", "PATROLLING"):
                return False, 409, {
                    "error": "UNIT_NO_LONGER_AVAILABLE",
                    "message": f"Police unit '{final_unit_id}' status is currently '{target_unit.status}' and unavailable for new dispatch."
                }

        # 9. Build Immutable AI Recommendation Snapshot JSON
        ai_snapshot = {
            "recommendation_id": rec.id,
            "recommended_unit_id": rec.unit_id,
            "target_location_id": rec.location_id,
            "target_location_name": rec.junction.name if rec.junction else f"Junction {rec.location_id}",
            "reason": rec.reason,
            "priority": rec.priority,
            "estimated_distance_km": rec.estimated_distance,
            "estimated_time_min": rec.estimated_time,
            "reasons": [
                r.strip() for r in rec.reason.split(";") if r.strip()
            ] if rec.reason else ["HIGH_RISK_SURGE"],
            "model_version": "rf_v2_retrained",
            "input_snapshot_id": "SNAP-00127",
            "created_at": rec.created_at.isoformat() if rec.created_at else None,
        }

        # Generate Unique Decision ID
        dec_id = f"DEC-{uuid.uuid4().hex[:8].upper()}"
        now = datetime.utcnow()

        # 10. Construct DecisionRecord Object
        decision_rec = DecisionRecord(
            decision_id=dec_id,
            recommendation_id=rec.id,
            incident_id=f"INC-{rec.location_id:04d}",
            location_id=rec.location_id,
            previous_recommendation_json=json.dumps(ai_snapshot),
            final_action=action,
            final_unit_id=final_unit_id if action != "REJECT" else None,
            reason_code=reason_code,
            comment=comment,
            operator_id=user_id,
            operator_username=username,
            operator_role=operator_role,
            operator_zone=operator_zone,
            model_version="rf_v2_retrained",
            input_snapshot_id="SNAP-00127",
            decision_status="RECORDED",
            dispatch_status="NOT_DISPATCHED",
            idempotency_key=idempotency_key,
            created_at=now,
            updated_at=now,
        )

        db.add(decision_rec)

        # 11. Create Append-Only AuditLog Event
        audit_action = f"DECISION_{action}"
        before_state = json.dumps({"recommended_unit_id": rec.unit_id, "location_id": rec.location_id})
        after_state = json.dumps({
            "action": action,
            "final_unit_id": final_unit_id,
            "reason_code": reason_code,
            "comment": comment
        })

        audit_entry = AuditLog(
            user_id=user_id,
            username=username,
            role=operator_role,
            zone_code=operator_zone,
            action=audit_action,
            resource_type="RECOMMENDATION_DECISION",
            resource_id=dec_id,
            details=f"Human Controller {username} [{operator_role}] executed {action} on AI Recommendation {rec.id}.",
            old_value=before_state,
            new_value=after_state,
            timestamp=now,
            success=True,
        )
        db.add(audit_entry)

        # 12. Transactional Live Dispatch & Status Transitions (ACCEPT & MODIFY)
        from app.models.deployment import Deployment
        if action in ("ACCEPT", "MODIFY"):
            try:
                # Update police unit status to DEPLOYED
                unit_to_deploy = db.query(PoliceUnit).filter(PoliceUnit.id == final_unit_id).first()
                if unit_to_deploy:
                    unit_to_deploy.status = "DEPLOYED"
                    unit_to_deploy.updated_at = now

                # Update recommendation
                rec.status = "ACCEPTED" if action == "ACCEPT" else "MODIFIED"
                if action == "MODIFY":
                    rec.unit_id = final_unit_id
                rec.updated_at = now

                # Create active Deployment record
                dep_id = f"dep_{int(now.timestamp())}_{final_unit_id}"
                deployment = Deployment(
                    id=dep_id,
                    unit_id=final_unit_id,
                    location_id=rec.location_id,
                    recommendation_id=rec.id,
                    status="ACTIVE",
                    deployed_at=now,
                )
                db.add(deployment)

                decision_rec.dispatch_id = dep_id
                decision_rec.dispatch_status = "DISPATCHED"
                decision_rec.decision_status = "DISPATCHED"
            except Exception as d_err:
                logger.error(f"Failed to execute live dispatch for decision '{dec_id}': {d_err}")
                decision_rec.dispatch_status = "FAILED"
                decision_rec.decision_status = "FAILED"
        else:
            # REJECT: Mark recommendation REJECTED without dispatching
            rec.status = "REJECTED"
            rec.updated_at = now
            decision_rec.dispatch_status = "NOT_DISPATCHED"
            decision_rec.decision_status = "RECORDED"

        try:
            db.commit()
            db.refresh(decision_rec)
        except IntegrityError as i_err:
            db.rollback()
            logger.error(f"Integrity conflict saving decision record: {i_err}")
            return False, 409, {
                "error": "RECOMMENDATION_ALREADY_DECIDED",
                "message": "This recommendation has already been decided."
            }
        except Exception as c_err:
            db.rollback()
            logger.error(f"Error committing decision record: {c_err}")
            return False, 500, {
                "error": "DATABASE_ERROR",
                "message": f"Failed to commit decision record: {c_err}"
            }

        return True, 200, decision_rec.to_dict()

    @staticmethod
    def get_decision_history(
        db: Session,
        user_zone: str = "ALL",
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Retrieves paginated decision records filtered by operator zone authorization."""
        query = db.query(DecisionRecord).order_by(DecisionRecord.created_at.desc())
        if user_zone != "ALL":
            query = query.filter(DecisionRecord.operator_zone == user_zone)
        records = query.limit(limit).all()
        return [r.to_dict() for r in records]

    @staticmethod
    def get_decision_by_id(db: Session, decision_id: str) -> Optional[Dict[str, Any]]:
        """Retrieves single decision record by decision_id."""
        rec = db.query(DecisionRecord).filter(DecisionRecord.decision_id == decision_id).first()
        return rec.to_dict() if rec else None
