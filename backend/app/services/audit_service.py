import logging
from typing import Dict, Any, List, Optional
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.decision_record import DecisionRecord

logger = logging.getLogger("audit_service")


class AuditService:
    """
    Append-Only Audit Log & Human Override Analytics Service.
    Guarantees immutable audit records with RBAC zone scoping.
    """

    @staticmethod
    def get_audit_logs(
        db: Session,
        user_zone: str = "ALL",
        action_filter: Optional[str] = None,
        search_query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Retrieves paginated audit event logs filtered by authorized zone.
        """
        query = db.query(AuditLog).order_by(AuditLog.timestamp.desc())

        if user_zone != "ALL":
            query = query.filter(AuditLog.zone_code == user_zone)

        if action_filter and action_filter.strip():
            query = query.filter(AuditLog.action.ilike(f"%{action_filter.strip()}%"))

        if search_query and search_query.strip():
            sq = f"%{search_query.strip()}%"
            query = query.filter(
                (AuditLog.username.ilike(sq)) |
                (AuditLog.resource_id.ilike(sq)) |
                (AuditLog.details.ilike(sq)) |
                (AuditLog.action.ilike(sq))
            )

        logs = query.offset(offset).limit(limit).all()
        return [l.to_dict() for l in logs]

    @staticmethod
    def get_human_override_analytics(
        db: Session,
        user_zone: str = "ALL"
    ) -> Dict[str, Any]:
        """
        Computes Human Override & AI Agreement metrics:
        Total Decided, ACCEPT count, MODIFY count, REJECT count,
        Acceptance Rate %, Modification Rate %, Rejection Rate %, AI-Human Agreement %.
        """
        query = db.query(DecisionRecord)
        if user_zone != "ALL":
            query = query.filter(DecisionRecord.operator_zone == user_zone)

        records = query.all()
        total_count = len(records)

        accepted_count = sum(1 for r in records if r.final_action == "ACCEPT")
        modified_count = sum(1 for r in records if r.final_action == "MODIFY")
        rejected_count = sum(1 for r in records if r.final_action == "REJECT")

        acceptance_rate = round((accepted_count / total_count * 100.0), 1) if total_count > 0 else 100.0
        modification_rate = round((modified_count / total_count * 100.0), 1) if total_count > 0 else 0.0
        rejection_rate = round((rejected_count / total_count * 100.0), 1) if total_count > 0 else 0.0

        # AI-Human Agreement Rate: Accepted / (Accepted + Modified)
        human_decisions = accepted_count + modified_count
        ai_human_agreement = round((accepted_count / human_decisions * 100.0), 1) if human_decisions > 0 else 100.0

        # Reason breakdown frequency dictionary
        reason_counts = {}
        for r in records:
            if r.reason_code:
                reason_counts[r.reason_code] = reason_counts.get(r.reason_code, 0) + 1

        return {
            "zone_code": user_zone,
            "total_recommendations_decided": total_count,
            "actions": {
                "accepted": accepted_count,
                "modified": modified_count,
                "rejected": rejected_count,
            },
            "rates": {
                "acceptance_rate_pct": acceptance_rate,
                "modification_rate_pct": modification_rate,
                "rejection_rate_pct": rejection_rate,
                "ai_human_agreement_pct": ai_human_agreement,
            },
            "override_reasons_breakdown": reason_counts,
        }
