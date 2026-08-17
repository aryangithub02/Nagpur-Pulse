from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.incident_service import incident_service
from app.schemas.api_schemas import IncidentItem, IncidentListResponse

router = APIRouter(prefix="/api/incidents", tags=["Frontend - Incidents"])


@router.get("", response_model=IncidentListResponse, summary="Get active/recent incidents")
def get_incidents(db: Session = Depends(get_db)) -> IncidentListResponse:
    """Return incidents across monitored locations by delegating to IncidentService."""
    incidents = incident_service.get_incidents(db)
    items = []
    for inc in incidents:
        loc_name = inc.junction.name if inc.junction else None
        items.append(
            IncidentItem(
                id=inc.id,
                locationId=str(inc.location_id),
                locationName=loc_name,
                timestamp=inc.timestamp,
                type=inc.type,
                severity=inc.severity,
                status=inc.status,
                description=inc.description,
                isSimulated=inc.is_simulated
            )
        )
    return IncidentListResponse(incidents=items)
