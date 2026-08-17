from typing import Dict, Any
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.incident_service import incident_service
from app.schemas.api_schemas import (
    IncidentItem,
    IncidentSimulateRequest,
    IncidentSimulateResponse,
    RecommendationItem,
)

router = APIRouter(prefix="/api/simulation", tags=["Frontend - Incident Simulation"])


@router.post("/incident", response_model=IncidentSimulateResponse, status_code=status.HTTP_201_CREATED, summary="Simulate an incident")
def simulate_incident(
    payload: IncidentSimulateRequest, db: Session = Depends(get_db)
) -> IncidentSimulateResponse:
    """Delegate incident simulation and recommendation generation to IncidentService."""
    incident, rec = incident_service.simulate_incident(db, payload.model_dump())

    loc_name = incident.junction.name if incident.junction else None

    inc_item = IncidentItem(
        id=incident.id,
        locationId=str(incident.location_id),
        locationName=loc_name,
        timestamp=incident.timestamp,
        type=incident.type,
        severity=incident.severity,
        status=incident.status,
        description=incident.description,
        isSimulated=incident.is_simulated
    )

    rec_item = None
    if rec:
        rec_item = RecommendationItem(
            id=rec.id,
            locationId=str(rec.location_id),
            locationName=rec.junction.name if rec.junction else None,
            recommendedUnitId=rec.unit_id,
            unitName=rec.unit.name if rec.unit else None,
            reason=rec.reason,
            priority=rec.priority,
            estimatedDistance=rec.estimated_distance,
            estimatedTime=rec.estimated_time,
            status=rec.status,
            timestamp=rec.created_at
        )

    return IncidentSimulateResponse(
        incident=inc_item,
        recommendation=rec_item
    )


@router.post("/reset", summary="Reset simulation state")
def reset_simulation(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Purge all simulated incidents and recommendations safely."""
    return incident_service.reset_simulation(db)
