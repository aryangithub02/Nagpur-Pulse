from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.police_unit_service import police_unit_service
from app.schemas.api_schemas import PoliceUnitItem, PoliceUnitListResponse

router = APIRouter(prefix="/api/police-units", tags=["Frontend - Police Units"])


@router.get("", response_model=PoliceUnitListResponse, summary="Get all police units with zone scope")
def get_all_police_units(
    zone: Optional[str] = Query(None, description="Optional zone code filter (CENTRAL, NORTH, EAST, WEST, SOUTH)"),
    db: Session = Depends(get_db)
) -> PoliceUnitListResponse:
    """Return police response units filtered by operational zone ownership."""
    units = police_unit_service.get_units(db)
    items = []
    for u in units:
        u_zone = getattr(u, "zone", None) or getattr(u, "zone_code", None)
        if zone and zone != "ALL" and u_zone:
            if u_zone.upper() != zone.upper():
                continue
        items.append(
            PoliceUnitItem(
                id=u.id,
                name=u.name,
                badgeNumber=u.badge_number,
                unitType=u.unit_type,
                status=u.status,
                latitude=u.latitude,
                longitude=u.longitude,
                updatedAt=u.updated_at
            )
        )
    return PoliceUnitListResponse(units=items)


@router.get("/available", response_model=PoliceUnitListResponse, summary="Get available police units")
def get_available_police_units(
    zone: Optional[str] = Query(None),
    db: Session = Depends(get_db)
) -> PoliceUnitListResponse:
    """Return available police units ready for dispatch."""
    units = police_unit_service.get_available_units(db)
    items = []
    for u in units:
        u_zone = getattr(u, "zone", None) or getattr(u, "zone_code", None)
        if zone and zone != "ALL" and u_zone:
            if u_zone.upper() != zone.upper():
                continue
        items.append(
            PoliceUnitItem(
                id=u.id,
                name=u.name,
                badgeNumber=u.badge_number,
                unitType=u.unit_type,
                status=u.status,
                latitude=u.latitude,
                longitude=u.longitude,
                updatedAt=u.updated_at
            )
        )
    return PoliceUnitListResponse(units=items)


@router.get("/{unit_id}", response_model=PoliceUnitItem, summary="Get specific police unit")
def get_police_unit_by_id(unit_id: str, db: Session = Depends(get_db)) -> PoliceUnitItem:
    """Return specific police unit details by delegating to PoliceUnitService."""
    u = police_unit_service.get_unit(db, unit_id)
    return PoliceUnitItem(
        id=u.id,
        name=u.name,
        badgeNumber=u.badge_number,
        unitType=u.unit_type,
        status=u.status,
        latitude=u.latitude,
        longitude=u.longitude,
        updatedAt=u.updated_at
    )
