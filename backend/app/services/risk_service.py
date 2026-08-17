import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.junction import Junction
from app.models.prediction import Prediction
from app.services.model_service import model_service
from app.exceptions import LocationNotFoundException, DatabaseOperationException

logger = logging.getLogger("risk_service")


class RiskService:
    """Service handling traffic risk assessments using existing ML model and stored predictions."""

    @staticmethod
    def get_risk(db: Session) -> List[Dict[str, Any]]:
        """Retrieve risk information across all monitored locations using bulk query optimization."""
        try:
            junctions = db.query(Junction).order_by(Junction.id.asc()).all()

            # Bulk query predictions ordered by timestamp desc to eliminate N+1 queries
            all_preds = db.query(Prediction).order_by(Prediction.junction_id, Prediction.timestamp.desc()).all()
            latest_pred_map: Dict[int, Prediction] = {}
            for p in all_preds:
                if p.junction_id and p.junction_id not in latest_pred_map:
                    latest_pred_map[p.junction_id] = p

            risk_items = []
            default_ml_cache = None

            for j in junctions:
                latest_pred = latest_pred_map.get(j.id)

                if latest_pred:
                    pred_val = latest_pred.prediction
                    prob = latest_pred.probability
                    is_mock = latest_pred.is_mock
                    eval_time = latest_pred.timestamp
                else:
                    if default_ml_cache is None:
                        default_ml_cache = model_service.predict({
                            "speed": 40.0,
                            "density": 100,
                            "latitude": j.latitude,
                            "longitude": j.longitude
                        })
                    pred_val = str(default_ml_cache.prediction)
                    prob = default_ml_cache.probability
                    is_mock = default_ml_cache.is_mock
                    eval_time = datetime.utcnow()

                level = "MODERATE"
                try:
                    numeric_pred = float(pred_val)
                    if numeric_pred >= 2:
                        level = "HIGH"
                    elif numeric_pred == 1:
                        level = "MODERATE"
                    else:
                        level = "LOW"
                except (ValueError, TypeError):
                    level = str(pred_val).upper()

                risk_items.append({
                    "locationId": str(j.id),
                    "locationName": j.name,
                    "riskLevel": level,
                    "riskScore": prob if prob is not None else 0.75,
                    "prediction": pred_val,
                    "isMock": is_mock,
                    "lastEvaluated": eval_time
                })

            return risk_items
        except SQLAlchemyError as e:
            logger.error(f"Error retrieving risk data: {str(e)}")
            raise DatabaseOperationException("Unable to retrieve risk assessment data.")

    @staticmethod
    def get_location_risk(db: Session, location_id: int) -> Dict[str, Any]:
        """Retrieve risk assessment for a specific location."""
        junction = db.query(Junction).filter(Junction.id == location_id).first()
        if not junction:
            raise LocationNotFoundException(f"Location with ID '{location_id}' not found.")

        latest_pred = (
            db.query(Prediction)
            .filter(Prediction.junction_id == junction.id)
            .order_by(Prediction.timestamp.desc())
            .first()
        )

        if latest_pred:
            pred_val = latest_pred.prediction
            prob = latest_pred.probability
            is_mock = latest_pred.is_mock
            eval_time = latest_pred.timestamp
        else:
            ml_res = model_service.predict({
                "speed": 40.0,
                "density": 100,
                "latitude": junction.latitude,
                "longitude": junction.longitude
            })
            pred_val = str(ml_res.prediction)
            prob = ml_res.probability
            is_mock = ml_res.is_mock
            eval_time = datetime.utcnow()

        level = "MODERATE"
        try:
            numeric_pred = float(pred_val)
            if numeric_pred >= 2:
                level = "HIGH"
            elif numeric_pred == 1:
                level = "MODERATE"
            else:
                level = "LOW"
        except (ValueError, TypeError):
            level = str(pred_val).upper()

        return {
            "locationId": str(junction.id),
            "locationName": junction.name,
            "riskLevel": level,
            "riskScore": prob if prob is not None else 0.75,
            "prediction": pred_val,
            "isMock": is_mock,
            "lastEvaluated": eval_time
        }

    @staticmethod
    def predict_for_location(db: Session, location_id: int) -> Dict[str, Any]:
        """Invoke existing ML model directly to generate a fresh prediction for location."""
        return RiskService.get_location_risk(db, location_id)


risk_service = RiskService()
