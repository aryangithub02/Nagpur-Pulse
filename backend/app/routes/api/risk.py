from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.risk_service import risk_service
from app.schemas.api_schemas import RiskItem, RiskResponse, LocationRiskResponse

router = APIRouter(prefix="/api/risk", tags=["Frontend - Risk"])


@router.get("", response_model=RiskResponse, summary="Get risk information across monitored locations")
def get_all_risk(db: Session = Depends(get_db)) -> RiskResponse:
    """Return traffic risk assessments across monitored locations by delegating to RiskService."""
    risk_data = risk_service.get_risk(db)
    items = [RiskItem(**item) for item in risk_data]
    return RiskResponse(riskData=items)


@router.get("/{location_id}", response_model=LocationRiskResponse, summary="Get risk for specific location")
def get_location_risk(location_id: str, db: Session = Depends(get_db)) -> LocationRiskResponse:
    """Return risk assessment for a specific location by delegating to RiskService."""
    j_id = int(location_id.replace("loc_", "")) if location_id.startswith("loc_") else int(location_id)
    risk_data = risk_service.get_location_risk(db, j_id)
    return LocationRiskResponse(risk=RiskItem(**risk_data))
