import logging
from datetime import datetime
from typing import Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.junction import Junction
from app.models.police_unit import PoliceUnit
from app.models.recommendation import Recommendation
from app.models.deployment import Deployment
from app.services.tomtom_service import tomtom_service
from app.exceptions import (
    LocationNotFoundException,
    RecommendationNotFoundException,
    UnitNotFoundException,
    UnitUnavailableException,
    DatabaseOperationException,
)

logger = logging.getLogger("deployment_service")


class DeploymentService:
    """Orchestration service managing police deployment recommendations, unit dispatch, and active deployment states."""

    @staticmethod
    def get_recommendations(db: Session) -> List[Recommendation]:
        """Retrieve all deployment recommendations ordered by creation timestamp descending."""
        try:
            return db.query(Recommendation).order_by(Recommendation.created_at.desc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching recommendations: {str(e)}")
            raise DatabaseOperationException("Unable to retrieve recommendations from database.")

    @staticmethod
    def get_deployments(db: Session) -> List[Deployment]:
        """Retrieve active deployments (status == 'ACTIVE')."""
        try:
            return (
                db.query(Deployment)
                .filter(Deployment.status == "ACTIVE")
                .order_by(Deployment.deployed_at.desc())
                .all()
            )
        except SQLAlchemyError as e:
            logger.error(f"Error fetching deployments: {str(e)}")
            raise DatabaseOperationException("Unable to retrieve deployments list.")

    @staticmethod
    def generate_recommendation_for_location(
        db: Session,
        location_id: int,
        reason: str,
        priority: str = "MEDIUM"
    ) -> Recommendation:
        """Find best available police unit ranked by TomTom estimated travel time & distance, create PENDING recommendation."""
        junction = db.query(Junction).filter(Junction.id == location_id).first()
        if not junction:
            raise LocationNotFoundException(f"Junction location with ID '{location_id}' not found.")

        # Retrieve AVAILABLE police units
        available_units = (
            db.query(PoliceUnit)
            .filter(PoliceUnit.status == "AVAILABLE")
            .all()
        )

        best_unit: Optional[PoliceUnit] = None
        best_distance: Optional[float] = None
        best_eta: Optional[float] = None

        if available_units:
            # Rank candidate available units using TomTom routing API ETAs
            candidates: List[Tuple[float, float, PoliceUnit]] = []
            for unit in available_units:
                route_res = tomtom_service.calculate_route(
                    origin_lat=unit.latitude,
                    origin_lon=unit.longitude,
                    dest_lat=junction.latitude,
                    dest_lon=junction.longitude
                )
                eta_min = route_res["travel_time_minutes"]
                dist_km = route_res["distance_km"]
                candidates.append((eta_min, dist_km, unit))

            candidates.sort(key=lambda x: (x[0], x[1]))
            best_eta, best_distance, best_unit = candidates[0]

        rec_id = f"rec_{int(datetime.utcnow().timestamp())}_{location_id}"
        unit_id = best_unit.id if best_unit else None

        formatted_reason = reason
        if best_unit and best_eta is not None:
            formatted_reason = f"{reason} (Nearest available unit based on estimated travel time: {best_eta} mins)"

        try:
            recommendation = Recommendation(
                id=rec_id,
                location_id=junction.id,
                unit_id=unit_id,
                reason=formatted_reason,
                priority=priority,
                estimated_distance=best_distance,
                estimated_time=best_eta,
                status="PENDING"
            )

            db.add(recommendation)
            db.commit()
            db.refresh(recommendation)

            logger.info(f"Generated recommendation '{rec_id}' for junction '{junction.name}' with unit '{unit_id}'")
            return recommendation
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error creating recommendation: {str(e)}")
            raise DatabaseOperationException("Failed to store recommendation record.")

    @staticmethod
    def accept_recommendation(db: Session, recommendation_id: str) -> Tuple[Recommendation, Deployment]:
        """Transactional recommendation acceptance: checks unit availability, activates deployment, and updates statuses."""
        try:
            rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
            if not rec:
                raise RecommendationNotFoundException(f"Recommendation with ID '{recommendation_id}' not found.")

            if rec.status != "PENDING":
                raise UnitUnavailableException(f"Recommendation '{recommendation_id}' is already {rec.status} and cannot be accepted.")

            if not rec.unit_id:
                raise UnitUnavailableException("Recommendation does not have an assigned police unit.")

            unit = db.query(PoliceUnit).filter(PoliceUnit.id == rec.unit_id).first()
            if not unit:
                raise UnitNotFoundException(f"Assigned police unit '{rec.unit_id}' not found.")

            if unit.status != "AVAILABLE":
                raise UnitUnavailableException(f"Police unit '{unit.name}' is currently {unit.status} and cannot be deployed.")

            # Mark unit DEPLOYED
            unit.status = "DEPLOYED"
            unit.updated_at = datetime.utcnow()

            # Mark recommendation ACCEPTED
            rec.status = "ACCEPTED"
            rec.updated_at = datetime.utcnow()

            # Create active Deployment
            dep_id = f"dep_{int(datetime.utcnow().timestamp())}_{unit.id}"
            deployment = Deployment(
                id=dep_id,
                unit_id=unit.id,
                location_id=rec.location_id,
                recommendation_id=rec.id,
                status="ACTIVE",
                deployed_at=datetime.utcnow()
            )
            db.add(deployment)

            db.commit()
            db.refresh(rec)
            db.refresh(deployment)

            logger.info(f"Accepted recommendation '{rec.id}': Unit '{unit.id}' deployed to location '{rec.location_id}'")
            return rec, deployment
        except (RecommendationNotFoundException, UnitNotFoundException, UnitUnavailableException):
            db.rollback()
            raise
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in accept_recommendation: {str(e)}")
            raise DatabaseOperationException("Database transaction failed during recommendation acceptance.")

    @staticmethod
    def reject_recommendation(db: Session, recommendation_id: str) -> Recommendation:
        """Reject recommendation: updates status to REJECTED without altering unit status."""
        try:
            rec = db.query(Recommendation).filter(Recommendation.id == recommendation_id).first()
            if not rec:
                raise RecommendationNotFoundException(f"Recommendation with ID '{recommendation_id}' not found.")

            if rec.status != "PENDING":
                raise UnitUnavailableException(f"Recommendation '{recommendation_id}' is already {rec.status}.")

            rec.status = "REJECTED"
            rec.updated_at = datetime.utcnow()

            db.commit()
            db.refresh(rec)

            logger.info(f"Rejected recommendation '{rec.id}'")
            return rec
        except (RecommendationNotFoundException, UnitUnavailableException):
            db.rollback()
            raise
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Database error in reject_recommendation: {str(e)}")
            raise DatabaseOperationException("Database error while rejecting recommendation.")


deployment_service = DeploymentService()
