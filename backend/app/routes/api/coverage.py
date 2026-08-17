from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.coverage_service import coverage_service
from app.exceptions import LocationNotFoundException
from app.schemas.api_schemas import (
    CoverageItem,
    CoverageResponse,
    LocationCoverageResponse,
)

router = APIRouter(prefix="/api/coverage", tags=["Frontend - Coverage"])


@router.get("", response_model=CoverageResponse, summary="Get overall police coverage metrics")
def get_coverage(db: Session = Depends(get_db)) -> CoverageResponse:
    """Return overall police coverage by delegating to CoverageService."""
    cov_data = coverage_service.get_coverage(db)
    locations = [CoverageItem(**item) for item in cov_data["locations"]]
    return CoverageResponse(
        overallCoveragePercentage=cov_data["overallCoveragePercentage"],
        totalActiveUnits=cov_data["totalActiveUnits"],
        locations=locations
    )


@router.get("/{location_id}", response_model=LocationCoverageResponse, summary="Get coverage for specific location")
def get_location_coverage(location_id: str, db: Session = Depends(get_db)) -> LocationCoverageResponse:
    """Return police coverage for a specific location by delegating to CoverageService."""
    try:
        j_id = int(location_id.replace("loc_", "")) if location_id.startswith("loc_") else int(location_id)
    except ValueError:
        raise LocationNotFoundException(f"Invalid location ID format: '{location_id}'.")

    cov_data = coverage_service.get_location_coverage(db, j_id)
    return LocationCoverageResponse(coverage=CoverageItem(**cov_data["coverage"]))
