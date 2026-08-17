import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models.junction import Junction
from app.models.observation import TrafficObservation
from app.schemas.observation import ObservationCreate, ObservationResponse

logger = logging.getLogger("observations_route")

router = APIRouter(prefix="/observations", tags=["Traffic Observations"])


@router.post(
    "",
    response_model=ObservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record traffic observation"
)
def create_observation(
    payload: ObservationCreate, db: Session = Depends(get_db)
) -> ObservationResponse:
    """Validate junction, store raw traffic observation in Neon PostgreSQL, and return created record."""
    try:
        # 1. Validate junction exists
        junction = db.query(Junction).filter(Junction.id == payload.junction_id).first()
        if not junction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cannot record observation. Junction with ID {payload.junction_id} not found."
            )

        # 2. Prepare timestamp
        obs_timestamp = payload.timestamp if payload.timestamp else datetime.utcnow()

        # 3. Create observation model instance
        observation = TrafficObservation(
            junction_id=payload.junction_id,
            timestamp=obs_timestamp,
            traffic_data=payload.traffic_data
        )

        # 4. Save to database
        db.add(observation)
        db.commit()
        db.refresh(observation)

        return observation
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error in POST /observations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database transaction error while storing observation."
        )
