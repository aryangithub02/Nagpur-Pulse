import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models.junction import Junction
from app.schemas.junction import JunctionCreate, JunctionResponse, JunctionListResponse

logger = logging.getLogger("junctions_route")

router = APIRouter(prefix="/junctions", tags=["Junctions"])


@router.get("", response_model=JunctionListResponse, summary="List all traffic junctions")
def list_junctions(db: Session = Depends(get_db)) -> JunctionListResponse:
    """Retrieve all monitored traffic junctions from Neon PostgreSQL."""
    try:
        junctions = db.query(Junction).order_by(Junction.id.asc()).all()
        return JunctionListResponse(junctions=junctions)
    except SQLAlchemyError as e:
        logger.error(f"Database error in GET /junctions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database query error while retrieving junctions."
        )


@router.get("/{junction_id}", response_model=JunctionResponse, summary="Get junction by ID")
def get_junction(junction_id: int, db: Session = Depends(get_db)) -> JunctionResponse:
    """Retrieve details for a single traffic junction by ID."""
    try:
        junction = db.query(Junction).filter(Junction.id == junction_id).first()
        if not junction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Junction with ID {junction_id} not found."
            )
        return junction
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error in GET /junctions/{junction_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database query error while retrieving junction."
        )


@router.post("", response_model=JunctionResponse, status_code=status.HTTP_201_CREATED, summary="Create junction")
def create_junction(payload: JunctionCreate, db: Session = Depends(get_db)) -> JunctionResponse:
    """Create a new traffic junction record in Neon PostgreSQL."""
    try:
        junction = Junction(
            name=payload.name,
            latitude=payload.latitude,
            longitude=payload.longitude,
            address=payload.address
        )
        db.add(junction)
        db.commit()
        db.refresh(junction)
        return junction
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error in POST /junctions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while saving junction record."
        )
