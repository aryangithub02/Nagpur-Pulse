import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.observation import TrafficObservation
from app.models.junction import Junction
from app.exceptions import LocationNotFoundException, DatabaseOperationException

logger = logging.getLogger("traffic_service")


class TrafficService:
    """Service handling traffic observations and telemetry state retrieval."""

    @staticmethod
    def get_traffic(db: Session) -> List[TrafficObservation]:
        """Retrieve latest traffic observations across monitored locations."""
        try:
            return db.query(TrafficObservation).order_by(TrafficObservation.timestamp.desc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching traffic observations: {str(e)}")
            raise DatabaseOperationException("Unable to retrieve traffic observations from database.")

    @staticmethod
    def get_traffic_by_location(db: Session, location_id: int) -> List[TrafficObservation]:
        """Retrieve all traffic observations for a specific junction location."""
        junction = db.query(Junction).filter(Junction.id == location_id).first()
        if not junction:
            raise LocationNotFoundException(f"Location with ID '{location_id}' not found.")

        try:
            return (
                db.query(TrafficObservation)
                .filter(TrafficObservation.junction_id == location_id)
                .order_by(TrafficObservation.timestamp.desc())
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error fetching location traffic: {str(e)}")
            raise DatabaseOperationException(f"Unable to retrieve traffic observations for location {location_id}.")

    @staticmethod
    def get_latest_traffic(db: Session, location_id: int) -> Optional[TrafficObservation]:
        """Retrieve the single most recent traffic observation for a location."""
        try:
            return (
                db.query(TrafficObservation)
                .filter(TrafficObservation.junction_id == location_id)
                .order_by(TrafficObservation.timestamp.desc())
                .first()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error fetching latest location traffic: {str(e)}")
            raise DatabaseOperationException("Unable to retrieve latest traffic observation.")

    @staticmethod
    def create_observation(db: Session, data: Dict[str, Any]) -> TrafficObservation:
        """Store a new traffic observation in Neon DB."""
        junction_id = data.get("junction_id")
        junction = db.query(Junction).filter(Junction.id == junction_id).first()
        if not junction:
            raise LocationNotFoundException(f"Location with ID '{junction_id}' not found.")

        try:
            obs = TrafficObservation(
                junction_id=junction_id,
                traffic_data=data.get("traffic_data", {})
            )
            db.add(obs)
            db.commit()
            db.refresh(obs)
            return obs
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error saving traffic observation: {str(e)}")
            raise DatabaseOperationException("Failed to store traffic observation.")


traffic_service = TrafficService()
