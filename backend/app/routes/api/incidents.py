from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.incident_service import incident_service
from app.schemas.api_schemas import IncidentItem, IncidentListResponse

router = APIRouter(prefix="/api/incidents", tags=["Frontend - Incidents"])


@router.get("", response_model=IncidentListResponse, summary="Get active/recent incidents with zone scope")
def get_incidents(
    zone: Optional[str] = Query(None, description="Optional operational zone scope (CENTRAL, NORTH, EAST, WEST, SOUTH)"),
    db: Session = Depends(get_db)
) -> IncidentListResponse:
    """Return incidents across monitored locations filtered by operational zone."""
    incidents = incident_service.get_incidents(db)
    items = []
    for inc in incidents:
        loc_name = inc.junction.name if inc.junction else None
        loc_zone = inc.junction.zone if inc.junction and hasattr(inc.junction, "zone") else None
        
        # Apply zone filter if provided
        if zone and zone != "ALL" and loc_zone:
            if loc_zone.upper() != zone.upper():
                continue

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
