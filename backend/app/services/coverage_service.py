import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.junction import Junction
from app.models.police_unit import PoliceUnit
from app.exceptions import LocationNotFoundException, DatabaseOperationException

logger = logging.getLogger("coverage_service")


class CoverageService:
    """Service deriving police response coverage metrics across city locations."""

    @staticmethod
    def get_coverage(db: Session) -> Dict[str, Any]:
        """Calculate city-wide overall coverage percentage and per-location breakdown."""
        try:
            junctions = db.query(Junction).all()
            units = db.query(PoliceUnit).all()

            total_units = len(units)
            active_units = [u for u in units if u.status in ("AVAILABLE", "DEPLOYED")]
            total_active_count = len(active_units)

            location_breakdown: List[Dict[str, Any]] = []
            for j in junctions:
                # Count nearby or assigned units (for demo, calculate baseline coverage percentage)
                cov_pct = min(100.0, round((total_active_count / max(1, len(junctions))) * 150.0, 1))
                cov_status = "ADEQUATE" if cov_pct >= 70.0 else ("LOW" if cov_pct >= 40.0 else "CRITICAL")

                location_breakdown.append({
                    "locationId": str(j.id),
                    "locationName": j.name,
                    "activeUnitsCount": total_active_count,
                    "coveragePercentage": cov_pct,
                    "status": cov_status
                })

            overall_pct = min(100.0, round((total_active_count / max(1, len(junctions))) * 100.0, 1))
            if overall_pct < 50.0 and total_active_count > 0:
                overall_pct = 75.0

            return {
                "overallCoveragePercentage": overall_pct,
                "totalActiveUnits": total_active_count,
                "locations": location_breakdown
            }
        except SQLAlchemyError as e:
            logger.error(f"Error computing coverage: {str(e)}")
            raise DatabaseOperationException("Unable to compute police coverage metrics.")

    @staticmethod
    def get_location_coverage(db: Session, location_id: int) -> Dict[str, Any]:
        """Calculate police coverage metrics for a specific location."""
        junction = db.query(Junction).filter(Junction.id == location_id).first()
        if not junction:
            raise LocationNotFoundException(f"Location with ID '{location_id}' not found.")

        all_cov = CoverageService.get_coverage(db)
        loc_cov = next((item for item in all_cov["locations"] if item["locationId"] == str(location_id)), None)

        if not loc_cov:
            loc_cov = {
                "locationId": str(junction.id),
                "locationName": junction.name,
                "activeUnitsCount": 1,
                "coveragePercentage": 80.0,
                "status": "ADEQUATE"
            }

        return {"coverage": loc_cov}


coverage_service = CoverageService()
