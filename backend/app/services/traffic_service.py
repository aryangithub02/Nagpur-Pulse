import logging
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.observation import TrafficObservation
from app.models.junction import Junction
from app.adapters.schemas.traffic import CanonicalTrafficState
from app.adapters.traffic.factory import TrafficAdapterFactory
from app.adapters.health import provider_health_service
from app.exceptions import LocationNotFoundException, DatabaseOperationException

logger = logging.getLogger("traffic_service")


class TrafficService:
    """
    Service handling traffic observations and telemetry state retrieval.
    Now supports both legacy DB observations and provider-independent CanonicalTrafficState objects.
    """

    def __init__(self):
        self.adapter = TrafficAdapterFactory.create()

    def get_canonical_traffic(self, db: Session) -> List[CanonicalTrafficState]:
        """
        Retrieve all latest traffic observations as provider-independent CanonicalTrafficState objects.
        """
        try:
            obs_list = db.query(TrafficObservation).order_by(TrafficObservation.timestamp.desc()).all()
            # Map by junction_id to take latest
            latest_map: Dict[int, TrafficObservation] = {}
            for obs in obs_list:
                if obs.junction_id not in latest_map:
                    latest_map[obs.junction_id] = obs

            junctions = {j.id: j for j in db.query(Junction).all()}
            canonical_states = []

            for j_id, obs in latest_map.items():
                j_obj = junctions.get(j_id)
                ctx = {
                    "junction_id": j_id,
                    "spatial_id": f"JNGP{j_id:03d}",
                    "latitude": j_obj.latitude if j_obj else 21.1458,
                    "longitude": j_obj.longitude if j_obj else 79.0882,
                }
                normalized = self.adapter.normalize(obs, spatial_context=ctx)
                if normalized:
                    canonical_states.extend(normalized)

            provider_health_service.record_success("traffic", self.adapter.provider_name, 1.2)
            return canonical_states
        except SQLAlchemyError as e:
            logger.error(f"Error fetching canonical traffic observations: {str(e)}")
            provider_health_service.record_failure("traffic", self.adapter.provider_name, str(e))
            return []

    def get_canonical_traffic_by_location(self, db: Session, location_id: int) -> Optional[CanonicalTrafficState]:
        """
        Retrieve single junction's canonical traffic state.
        """
        obs = self.get_latest_traffic(db, location_id)
        if not obs:
            return None

        j_obj = db.query(Junction).filter(Junction.id == location_id).first()
        ctx = {
            "junction_id": location_id,
            "spatial_id": f"JNGP{location_id:03d}",
            "latitude": j_obj.latitude if j_obj else 21.1458,
            "longitude": j_obj.longitude if j_obj else 79.0882,
        }
        normalized = self.adapter.normalize(obs, spatial_context=ctx)
        return normalized[0] if normalized else None

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

