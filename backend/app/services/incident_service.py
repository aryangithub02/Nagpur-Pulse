import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.incident import Incident
from app.models.junction import Junction
from app.models.recommendation import Recommendation
from app.models.deployment import Deployment
from app.exceptions import LocationNotFoundException, DatabaseOperationException
from app.services.deployment_service import deployment_service

logger = logging.getLogger("incident_service")


class IncidentService:
    """Service managing traffic incident lifecycles, active queries, and simulation workflows."""

    @staticmethod
    def get_incidents(db: Session) -> List[Incident]:
        """Retrieve all recorded incidents ordered by timestamp descending."""
        try:
            return db.query(Incident).order_by(Incident.timestamp.desc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching incidents: {str(e)}")
            raise DatabaseOperationException("Unable to retrieve incidents list.")

    @staticmethod
    def get_active_incidents(db: Session) -> List[Incident]:
        """Retrieve active incidents (status == 'ACTIVE')."""
        try:
            return db.query(Incident).filter(Incident.status == "ACTIVE").order_by(Incident.timestamp.desc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching active incidents: {str(e)}")
            raise DatabaseOperationException("Unable to retrieve active incidents.")

    @staticmethod
    def get_incident(db: Session, incident_id: str) -> Optional[Incident]:
        """Retrieve an incident record by ID."""
        try:
            return db.query(Incident).filter(Incident.id == incident_id).first()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching incident {incident_id}: {str(e)}")
            raise DatabaseOperationException(f"Unable to retrieve incident '{incident_id}'.")

    @staticmethod
    def create_incident(db: Session, data: Dict[str, Any]) -> Incident:
        """Create and persist a new traffic incident record."""
        location_id = data.get("location_id")
        junction = db.query(Junction).filter(Junction.id == location_id).first()
        if not junction:
            raise LocationNotFoundException(f"Location with ID '{location_id}' not found.")

        try:
            inc_id = data.get("id") or f"inc_{int(datetime.utcnow().timestamp())}"
            incident = Incident(
                id=inc_id,
                location_id=junction.id,
                timestamp=data.get("timestamp", datetime.utcnow()),
                type=data.get("type", "ACCIDENT"),
                severity=data.get("severity", "HIGH"),
                status=data.get("status", "ACTIVE"),
                description=data.get("description", f"Incident at {junction.name}"),
                is_simulated=data.get("is_simulated", False)
            )
            db.add(incident)
            db.commit()
            db.refresh(incident)
            return incident
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error creating incident: {str(e)}")
            raise DatabaseOperationException("Failed to store incident record.")

    @staticmethod
    def simulate_incident(db: Session, data: Dict[str, Any]) -> Tuple[Incident, Any]:
        """Simulate an incident: stores simulated incident & triggers deployment recommendation."""
        loc_str = str(data.get("locationId", data.get("location_id", "1")))
        try:
            j_id = int(loc_str.replace("loc_", "")) if loc_str.startswith("loc_") else int(loc_str)
        except ValueError:
            raise LocationNotFoundException(f"Invalid location ID format: '{loc_str}'.")

        junction = db.query(Junction).filter(Junction.id == j_id).first()
        if not junction:
            raise LocationNotFoundException(f"Location with ID '{loc_str}' not found.")

        inc_id = f"sim_inc_{int(datetime.utcnow().timestamp())}"
        inc_type = data.get("type", "ACCIDENT")
        severity = data.get("severity", "HIGH")
        desc = data.get("description") or f"SIMULATED {severity} severity {inc_type} at {junction.name}"

        try:
            incident = Incident(
                id=inc_id,
                location_id=junction.id,
                timestamp=datetime.utcnow(),
                type=inc_type,
                severity=severity,
                status="ACTIVE",
                description=desc,
                is_simulated=True
            )
            db.add(incident)
            db.commit()
            db.refresh(incident)

            rec_reason = f"Simulated {severity} severity incident ({inc_type}) at {junction.name}"
            recommendation = deployment_service.generate_recommendation_for_location(
                db=db,
                location_id=junction.id,
                reason=rec_reason,
                priority=severity
            )

            return incident, recommendation
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error executing incident simulation: {str(e)}")
            raise DatabaseOperationException("Incident simulation transaction failed.")

    @staticmethod
    def reset_simulation(db: Session) -> Dict[str, Any]:
        """Purges simulated incidents and associated simulation recommendations/deployments."""
        try:
            # Delete simulated incidents
            sim_incidents = db.query(Incident).filter(Incident.is_simulated == True).all()
            deleted_incidents_count = len(sim_incidents)
            for inc in sim_incidents:
                db.delete(inc)

            # Delete recommendations created during simulation (ID starts with rec_sim or contains sim)
            sim_recs = db.query(Recommendation).filter(Recommendation.id.like("%sim%")).all()
            deleted_recs_count = len(sim_recs)
            for rec in sim_recs:
                db.delete(rec)

            db.commit()
            logger.info(f"Reset simulation state: deleted {deleted_incidents_count} incidents and {deleted_recs_count} recommendations.")
            return {
                "success": True,
                "message": f"Simulation reset successfully. Purged {deleted_incidents_count} incidents and {deleted_recs_count} recommendations.",
                "deletedIncidents": deleted_incidents_count,
                "deletedRecommendations": deleted_recs_count
            }
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error resetting simulation state: {str(e)}")
            raise DatabaseOperationException("Failed to reset simulation state.")

    @staticmethod
    def update_incident_status(db: Session, incident_id: str, new_status: str) -> Incident:
        """Update an incident's status (e.g. ACTIVE -> RESOLVED)."""
        incident = db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            raise DatabaseOperationException(f"Incident '{incident_id}' not found.")

        try:
            incident.status = new_status
            db.commit()
            db.refresh(incident)
            return incident
        except SQLAlchemyError as e:
            db.rollback()
            raise DatabaseOperationException("Failed to update incident status.")


incident_service = IncidentService()
