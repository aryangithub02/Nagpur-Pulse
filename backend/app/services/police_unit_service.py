import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.police_unit import PoliceUnit
from app.adapters.schemas.police import CanonicalPoliceUnitState
from app.adapters.police.simulated import SimulatedPoliceAdapter
from app.adapters.health import provider_health_service
from app.exceptions import UnitNotFoundException, UnitUnavailableException, DatabaseOperationException

logger = logging.getLogger("police_unit_service")


class PoliceUnitService:
    """
    Service managing police unit queries, status transitions, and availability checks.
    Supports both ORM models and provider-independent CanonicalPoliceUnitState objects.
    """

    def __init__(self):
        self.adapter = SimulatedPoliceAdapter()

    def get_canonical_units(self, db: Session, zone_code: Optional[str] = None) -> List[CanonicalPoliceUnitState]:
        """
        Retrieve all police units normalized into CanonicalPoliceUnitState list.
        """
        units = self.get_units(db, zone_code=zone_code)
        canonical = self.adapter.normalize_units(units)
        provider_health_service.record_success("police", self.adapter.provider_name, 0.5)
        return canonical

    @staticmethod
    def get_units(db: Session, zone_code: Optional[str] = None) -> List[PoliceUnit]:
        """Retrieve all police response units, optionally filtered by zone_code if attribute exists."""
        try:
            query = db.query(PoliceUnit)
            if zone_code and zone_code != "ALL" and hasattr(PoliceUnit, "zone_code"):
                query = query.filter(getattr(PoliceUnit, "zone_code") == zone_code)
            return query.order_by(PoliceUnit.id.asc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching police units: {str(e)}")
            raise DatabaseOperationException("Unable to retrieve police units list.")

    @staticmethod
    def get_unit(db: Session, unit_id: str) -> PoliceUnit:
        """Retrieve single police unit by ID or raise UnitNotFoundException."""
        try:
            unit = db.query(PoliceUnit).filter(PoliceUnit.id == unit_id).first()
            if not unit:
                raise UnitNotFoundException(f"Police unit with ID '{unit_id}' not found.")
            return unit
        except SQLAlchemyError as e:
            logger.error(f"Error fetching police unit '{unit_id}': {str(e)}")
            raise DatabaseOperationException(f"Unable to retrieve unit '{unit_id}'.")

    @staticmethod
    def get_available_units(db: Session) -> List[PoliceUnit]:
        """Retrieve units with status == 'AVAILABLE'."""
        try:
            return db.query(PoliceUnit).filter(PoliceUnit.status == "AVAILABLE").order_by(PoliceUnit.id.asc()).all()
        except SQLAlchemyError as e:
            logger.error(f"Error fetching available police units: {str(e)}")
            raise DatabaseOperationException("Unable to retrieve available police units.")

    @staticmethod
    def is_unit_available(db: Session, unit_id: str) -> bool:
        """Check if unit exists and has AVAILABLE status."""
        unit = PoliceUnitService.get_unit(db, unit_id)
        return unit.status == "AVAILABLE"

    @staticmethod
    def update_status(db: Session, unit_id: str, new_status: str) -> PoliceUnit:
        """Update unit status (AVAILABLE, DEPLOYED, UNAVAILABLE/OFFLINE)."""
        valid_statuses = {"AVAILABLE", "DEPLOYED", "OFFLINE", "UNAVAILABLE"}
        formatted_status = new_status.upper()
        if formatted_status not in valid_statuses:
            raise UnitUnavailableException(f"Invalid status '{new_status}'. Allowed: {valid_statuses}")

        unit = PoliceUnitService.get_unit(db, unit_id)
        try:
            unit.status = formatted_status
            unit.updated_at = datetime.utcnow()
            db.commit()
            db.refresh(unit)
            return unit
        except SQLAlchemyError as e:
            db.rollback()
            logger.error(f"Error updating unit status: {str(e)}")
            raise DatabaseOperationException(f"Failed to update status for unit '{unit_id}'.")

    @staticmethod
    def deploy_unit(db: Session, unit_id: str) -> PoliceUnit:
        """Set unit status to DEPLOYED if currently AVAILABLE."""
        unit = PoliceUnitService.get_unit(db, unit_id)
        if unit.status != "AVAILABLE":
            raise UnitUnavailableException(f"Police unit '{unit.name}' is currently {unit.status} and cannot be deployed.")
        return PoliceUnitService.update_status(db, unit_id, "DEPLOYED")

    @staticmethod
    def release_unit(db: Session, unit_id: str) -> PoliceUnit:
        """Release unit back to AVAILABLE status."""
        return PoliceUnitService.update_status(db, unit_id, "AVAILABLE")


police_unit_service = PoliceUnitService()
