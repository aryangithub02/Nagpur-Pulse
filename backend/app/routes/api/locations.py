from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models.junction import Junction
from app.schemas.api_schemas import LocationItem, LocationListResponse

router = APIRouter(prefix="/api/locations", tags=["Frontend - Locations"])


@router.get("", response_model=LocationListResponse, summary="Get monitored locations/junctions")
def get_locations(db: Session = Depends(get_db)) -> LocationListResponse:
    """Return all monitored traffic locations/junctions from Neon PostgreSQL."""
    try:
        junctions = db.query(Junction).order_by(Junction.id.asc()).all()
        loc_items = [
            LocationItem(
                id=str(j.id),
                name=j.name,
                latitude=j.latitude,
                longitude=j.longitude,
                address=j.address
            )
            for j in junctions
        ]
        return LocationListResponse(locations=loc_items)
    except SQLAlchemyError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database query error while retrieving locations: {str(e)}"
        )
