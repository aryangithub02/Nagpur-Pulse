from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.traffic_service import traffic_service
from app.schemas.api_schemas import TrafficItem, TrafficListResponse

router = APIRouter(prefix="/api/traffic", tags=["Frontend - Traffic"])


@router.get("", response_model=TrafficListResponse, summary="Get current traffic observations")
def get_traffic(db: Session = Depends(get_db)) -> TrafficListResponse:
    """Return traffic observations across monitored locations by delegating to TrafficService."""
    observations = traffic_service.get_traffic(db)
    items = []
    for obs in observations:
        data = obs.traffic_data or {}
        speed = data.get("speed") or data.get("average_speed") or 40.0
        density = data.get("density") or data.get("vehicle_count") or 85
        level = "MODERATE"
        if speed < 25 or density > 120:
            level = "HIGH"
        elif speed > 50 and density < 50:
            level = "LOW"

        items.append(
            TrafficItem(
                id=str(obs.id),
                locationId=str(obs.junction_id),
                timestamp=obs.timestamp,
                speed=float(speed),
                density=float(density),
                congestionLevel=level,
                details=data
            )
        )
    return TrafficListResponse(traffic=items)


@router.get("/{location_id}", response_model=TrafficListResponse, summary="Get traffic for specific location")
def get_traffic_by_location(location_id: str, db: Session = Depends(get_db)) -> TrafficListResponse:
    """Return traffic observations for a specific location by delegating to TrafficService."""
    j_id = int(location_id.replace("loc_", "")) if location_id.startswith("loc_") else int(location_id)
    observations = traffic_service.get_traffic_by_location(db, j_id)

    items = []
    for obs in observations:
        data = obs.traffic_data or {}
        speed = data.get("speed") or data.get("average_speed") or 40.0
        density = data.get("density") or data.get("vehicle_count") or 85
        level = "MODERATE"
        if speed < 25 or density > 120:
            level = "HIGH"
        elif speed > 50 and density < 50:
            level = "LOW"

        items.append(
            TrafficItem(
                id=str(obs.id),
                locationId=str(obs.junction_id),
                timestamp=obs.timestamp,
                speed=float(speed),
                density=float(density),
                congestionLevel=level,
                details=data
            )
        )
    return TrafficListResponse(traffic=items)
