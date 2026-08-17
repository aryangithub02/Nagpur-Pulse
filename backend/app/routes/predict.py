import logging
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.models.junction import Junction
from app.models.prediction import Prediction
from app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    PredictionHistoryResponse,
    PredictionHistoryItem,
)
from app.services.model_service import (
    model_service,
    ModelLoadingError,
    ModelPredictionError,
    ModelNotFoundError,
)

logger = logging.getLogger("predict_route")

router = APIRouter(tags=["Prediction"])


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict traffic risk & record prediction",
    description="Consumes ML feature inputs, computes prediction, persists result in Neon PostgreSQL, and returns output.",
)
def predict(
    request: PredictionRequest, db: Session = Depends(get_db)
) -> PredictionResponse:
    """Run model inference, record prediction in database, and return prediction response."""
    # 1. Validate junction if junction_id provided
    junction_id = request.junction_id
    if junction_id is not None:
        try:
            junction = db.query(Junction).filter(Junction.id == junction_id).first()
            if not junction:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Target junction with ID {junction_id} not found."
                )
        except SQLAlchemyError as e:
            logger.error(f"Database lookup error for junction {junction_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database error while validating junction."
            )

    # 2. Invoke ML model service
    try:
        model_output = model_service.predict(request.features)
    except ModelNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_533_SERVICE_UNAVAILABLE if hasattr(status, "HTTP_533_SERVICE_UNAVAILABLE") else status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model artifact unavailable: {str(e)}"
        )
    except ModelLoadingError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load ML model: {str(e)}"
        )
    except ModelPredictionError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error executing prediction model: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during prediction: {str(e)}"
        )

    # 3. Persist prediction in Neon PostgreSQL database
    pred_record_id: Optional[int] = None
    pred_timestamp = datetime.utcnow()

    try:
        db_prediction = Prediction(
            junction_id=junction_id,
            timestamp=pred_timestamp,
            prediction=str(model_output.prediction),
            probability=model_output.probability,
            is_mock=model_output.is_mock,
            features_used=request.features,
        )
        db.add(db_prediction)
        db.commit()
        db.refresh(db_prediction)
        pred_record_id = db_prediction.id
    except SQLAlchemyError as db_err:
        db.rollback()
        logger.error(f"Failed to persist prediction to database: {str(db_err)}")
        # Do not fail prediction output if DB storage fails; log error and attach advisory message
        model_output.message = (
            f"{model_output.message or ''} (Warning: Database prediction persistence failed)".strip()
        )

    return PredictionResponse(
        id=pred_record_id,
        junction_id=junction_id,
        timestamp=pred_timestamp,
        success=model_output.success,
        prediction=model_output.prediction,
        probability=model_output.probability,
        is_mock=model_output.is_mock,
        message=model_output.message,
    )


@router.get(
    "/predictions/{junction_id}",
    response_model=PredictionHistoryResponse,
    summary="Get prediction history for a junction",
    description="Returns recent stored predictions for the specified junction sorted by timestamp descending.",
)
def get_prediction_history(
    junction_id: int,
    limit: int = Query(20, ge=1, le=100, description="Max number of historical records to return"),
    db: Session = Depends(get_db),
) -> PredictionHistoryResponse:
    """Retrieve prediction history for a specific traffic junction."""
    try:
        # Validate junction exists
        junction = db.query(Junction).filter(Junction.id == junction_id).first()
        if not junction:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Junction with ID {junction_id} not found."
            )

        history_records = (
            db.query(Prediction)
            .filter(Prediction.junction_id == junction_id)
            .order_by(Prediction.timestamp.desc())
            .limit(limit)
            .all()
        )

        items = [
            PredictionHistoryItem(
                id=rec.id,
                junction_id=rec.junction_id,
                timestamp=rec.timestamp,
                prediction=rec.prediction,
                probability=rec.probability,
                is_mock=rec.is_mock,
                features_used=rec.features_used,
                created_at=rec.created_at,
            )
            for rec in history_records
        ]

        return PredictionHistoryResponse(junction_id=junction_id, predictions=items)
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error in GET /predictions/{junction_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error while fetching prediction history."
        )
