import sys
from pathlib import Path

# Ensure project root is in sys.path for ml module imports
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.models.junction import Junction
from app.models.prediction import Prediction
from app.models.incident import Incident
from app.models.observation import TrafficObservation
from app.services.ml.ml_client import ml_client
from app.services.ml.schemas import SinglePredictionRequest, PredictionProbabilities
from app.exceptions import LocationNotFoundException, DatabaseOperationException

logger = logging.getLogger("risk_service")

# Stale prediction threshold constant
RISK_STALE_AFTER_MINUTES = 10


class RiskService:
    """
    Central Integration Layer between Backend Traffic/Incident Data, PostgreSQL, and ML Service.
    Orchestrates Phase 2 canonical data flow:
      TrafficService + IncidentService + Junction Features -> MLClient -> ML Service -> PostgreSQL -> Frontend APIs
    """

    @staticmethod
    def get_canonical_junction_id(j: Junction) -> str:
        """Format junction integer ID to standard string canonical format (e.g. JNGP001)."""
        return f"JNGP{j.id:03d}"

    @staticmethod
    def parse_junction_id(location_id: str, db: Session) -> Junction:
        """Resolves string location_id ('JNGP001', 'loc_1', '1') to Junction entity."""
        raw_str = str(location_id).strip()
        j_obj = None

        if raw_str.startswith("JNGP"):
            try:
                numeric_part = int(raw_str.replace("JNGP", ""))
                j_obj = db.query(Junction).filter(Junction.id == numeric_part).first()
            except ValueError:
                pass
        elif raw_str.startswith("loc_"):
            try:
                numeric_part = int(raw_str.replace("loc_", ""))
                j_obj = db.query(Junction).filter(Junction.id == numeric_part).first()
            except ValueError:
                pass
        else:
            try:
                numeric_part = int(raw_str)
                j_obj = db.query(Junction).filter(Junction.id == numeric_part).first()
            except ValueError:
                pass

        if not j_obj:
            # Fallback search by junction name matching
            j_obj = db.query(Junction).filter(Junction.name.ilike(f"%{raw_str}%")).first()

        if not j_obj:
            raise LocationNotFoundException(f"Junction with location_id '{location_id}' not found.")
        return j_obj

    @staticmethod
    def compute_junction_ml_features(db: Session, junction: Junction) -> Dict[str, Any]:
        """
        Extracts normalized features from TrafficService and IncidentService for ML inference:
        - month, temporal context
        - total_accidents, accidents_7d, accidents_30d, accidents_lag_1, accidents_rolling_mean_3
        - speed, density, congestion
        """
        now = datetime.utcnow()
        month = now.month

        # 1. Load exact historical dataset statistics for junction from nagpur_accidents_2020_2025.xlsx
        from app.services.accident_dataset_loader import get_junction_accident_stats
        ds = get_junction_accident_stats(junction.name)
        
        base_total = float(ds.get("total_accidents", 35))
        base_injuries = float(ds.get("injuries", 45))
        base_fatalities = float(ds.get("fatalities", 2))
        base_7d = float(ds.get("accidents_7d", 1))
        base_30d = float(ds.get("accidents_30d", 3))

        # 2. Extract live traffic speed & congestion from TomTom API / TrafficObservation
        latest_obs = (
            db.query(TrafficObservation)
            .filter(TrafficObservation.junction_id == junction.id)
            .order_by(TrafficObservation.timestamp.desc())
            .first()
        )
        speed = 40.0
        density = 100.0
        congestion = 35.0

        if latest_obs and latest_obs.traffic_data:
            tdata = latest_obs.traffic_data
            speed = float(tdata.get("speed", tdata.get("averageSpeed", 40.0)))
            density = float(tdata.get("density", tdata.get("volume", 100.0)))
            congestion = float(tdata.get("congestion", 35.0))

        # 3. Apply live congestion factor to historical baseline
        congestion_mult = 1.0
        if speed < 18.0 or congestion > 70.0:
            congestion_mult = 1.8
        elif speed < 28.0 or congestion > 50.0:
            congestion_mult = 1.3
        elif speed > 42.0 and congestion < 30.0:
            congestion_mult = 0.85

        eff_accidents_7d = max(0.5, round(base_7d * congestion_mult, 1))
        eff_accidents_30d = max(1.0, round(base_30d * congestion_mult, 1))
        eff_total = max(5.0, round(base_total * congestion_mult, 1))
        injury_acc = round(base_injuries * congestion_mult, 1)
        fatal_acc = round(base_fatalities * congestion_mult, 1)

        # Inject live Nagpur weather features from WeatherService
        try:
            from app.services.weather_service import weather_service
            curr_weather = weather_service.get_current_weather()
            w = curr_weather["weather"]
            w_impact = curr_weather["traffic_impact"]["score"]
            
            temp_c = float(w.get("temperature_c", 28.0))
            humidity_pct = float(w.get("humidity_pct", 65.0))
            precip_mm = float(w.get("precipitation_mm", 0.0))
            vis_km = float(w.get("visibility_km", 10.0))
            wind_kmh = float(w.get("wind_speed_kmh", 12.0))
            storm_flag = 1.0 if w.get("storm_flag", False) else 0.0
        except Exception:
            temp_c = 28.0
            humidity_pct = 65.0
            precip_mm = 0.0
            vis_km = 10.0
            wind_kmh = 12.0
            storm_flag = 0.0
            w_impact = 0.0

        return {
            "junction_id": RiskService.get_canonical_junction_id(junction),
            "month": month,
            "total_accidents": round(eff_total, 1),
            "injury_accidents": round(injury_acc, 1),
            "fatal_accidents": round(fatal_acc, 1),
            "accidents_7d": round(eff_accidents_7d, 1),
            "accidents_30d": round(eff_accidents_30d, 1),
            "accidents_90d": round(eff_accidents_30d * 2.5, 1),
            "accidents_1y": round(eff_total, 1),
            "accidents_lag_1": round(eff_accidents_7d, 1),
            "accidents_rolling_mean_3": round(eff_accidents_30d / 3.0, 2),
            "accidents_rolling_mean_6": round(eff_accidents_30d / 3.0, 2),
            "historical_accident_rate": round(eff_accidents_30d / 12.0, 2),
            "junction_target_enc": float(junction.id % 4),
            "junction_ordinal_enc": float(junction.id),
            "speed": speed,
            "density": density,
            "congestion": congestion,
            "temperature_c": temp_c,
            "humidity_pct": humidity_pct,
            "precipitation_mm": precip_mm,
            "visibility_km": vis_km,
            "wind_speed_kmh": wind_kmh,
            "storm_flag": storm_flag,
            "weather_impact_score": w_impact,
        }

    @staticmethod
    def generate_and_store_prediction(db: Session, junction: Junction) -> Prediction:
        """
        Gathers features, calls MLClient, validates ML output, and persists prediction to DB.
        """
        canonical_id = RiskService.get_canonical_junction_id(junction)
        features = RiskService.compute_junction_ml_features(db, junction)
        now = datetime.utcnow()

        from ml.inference.predictor import RiskPredictor
        p_res = RiskPredictor().predict(features)

        risk_level = p_res["predicted_class"]
        risk_score = p_res["risk_score"]
        probs = p_res["probabilities"]
        shap_exp = p_res.get("shap_explanation", [])

        p_low = probs.get("LOW", 0.0) * 100.0 if probs.get("LOW", 0.0) <= 1.0 else probs.get("LOW", 0.0)
        p_med = probs.get("MEDIUM", 0.0) * 100.0 if probs.get("MEDIUM", 0.0) <= 1.0 else probs.get("MEDIUM", 0.0)
        p_high = probs.get("HIGH", 0.0) * 100.0 if probs.get("HIGH", 0.0) <= 1.0 else probs.get("HIGH", 0.0)
        p_crit = probs.get("CRITICAL", 0.0) * 100.0 if probs.get("CRITICAL", 0.0) <= 1.0 else probs.get("CRITICAL", 0.0)

        features_to_store = dict(features)
        if shap_exp:
            features_to_store["shap_explanation"] = shap_exp

        pred_record = Prediction(
            junction_id=junction.id,
            junction_id_str=canonical_id,
            timestamp=now,
            prediction_time=now,
            prediction=risk_level,
            risk_level=risk_level,
            risk_score=risk_score,
            probability=risk_score,
            probability_low=p_low,
            probability_medium=p_med,
            probability_high=p_high,
            probability_critical=p_crit,
            model_name="RandomForest",
            model_version="rf_v2_retrained",
            feature_version="features_v2",
            is_mock=False,
            features_used=features_to_store,
        )

        try:
            db.add(pred_record)
            db.commit()
            db.refresh(pred_record)
            logger.info(f"✅ [NEON DB INSERT] RiskService Persisted Prediction Record ID #{pred_record.id} for Junction ID {junction.id} ({junction.name})")
            return pred_record
        except SQLAlchemyError as err:
            db.rollback()
            logger.error(f"Failed to persist prediction record for junction {junction.id}: {err}")
            raise DatabaseOperationException("Failed to persist ML prediction.")

    @staticmethod
    def is_prediction_stale(pred: Optional[Prediction]) -> bool:
        if not pred or not pred.timestamp:
            return True
        ts = pred.timestamp.replace(tzinfo=None) if pred.timestamp.tzinfo else pred.timestamp
        return (datetime.utcnow() - ts) > timedelta(minutes=RISK_STALE_AFTER_MINUTES)

    @staticmethod
    def get_latest_prediction_for_junction(db: Session, junction: Junction, force_refresh: bool = False) -> Prediction:
        """
        Retrieves recent cached prediction or generates a new one if stale (> 10 minutes) or force_refresh=True.
        """
        if not force_refresh:
            latest = (
                db.query(Prediction)
                .filter(Prediction.junction_id == junction.id)
                .order_by(Prediction.timestamp.desc())
                .first()
            )
            if latest and not RiskService.is_prediction_stale(latest):
                return latest

        return RiskService.generate_and_store_prediction(db, junction)

    @staticmethod
    def get_risk(db: Session) -> List[Dict[str, Any]]:
        """
        Retrieve latest risk data across all monitored locations for frontend dashboards.
        """
        try:
            junctions = db.query(Junction).order_by(Junction.id.asc()).all()
            
            # Fetch all predictions ordered by timestamp desc and map latest per junction in memory
            all_preds = db.query(Prediction).order_by(Prediction.timestamp.desc()).all()
            pred_map = {}
            for p in all_preds:
                if p.junction_id and p.junction_id not in pred_map:
                    pred_map[p.junction_id] = p

            results = []
            for j in junctions:
                pred = pred_map.get(j.id)
                if not pred:
                    risk_level = "LOW"
                    risk_score = 15.0
                    p_low, p_med, p_high, p_crit = 100.0, 0.0, 0.0, 0.0
                    model_ver = "rf_v2_retrained"
                    ts_iso = datetime.utcnow().isoformat()
                else:
                    risk_level = pred.risk_level or pred.prediction
                    risk_score = pred.risk_score if pred.risk_score is not None else 15.0
                    p_low = pred.probability_low or 0.0
                    p_med = pred.probability_medium or 0.0
                    p_high = pred.probability_high or 0.0
                    p_crit = pred.probability_critical or 0.0
                    model_ver = pred.model_version or "rf_v2_retrained"
                    ts_iso = pred.timestamp.isoformat() if pred.timestamp else datetime.utcnow().isoformat()

                canonical_id = RiskService.get_canonical_junction_id(j)
                is_stale = RiskService.is_prediction_stale(pred) if pred else False

                results.append({
                    "locationId": str(j.id),
                    "canonicalJunctionId": canonical_id,
                    "locationName": j.name,
                    "latitude": j.latitude,
                    "longitude": j.longitude,
                    "riskLevel": risk_level,
                    "riskScore": risk_score,
                    "prediction": risk_level,
                    "probabilities": {
                        "LOW": p_low,
                        "MEDIUM": p_med,
                        "HIGH": p_high,
                        "CRITICAL": p_crit,
                    },
                    "modelVersion": model_ver,
                    "isMock": False,
                    "isStale": is_stale,
                    "lastEvaluated": ts_iso
                })

            return results
        except SQLAlchemyError as e:
            logger.error(f"Error fetching bulk risk assessments: {e}")
            raise DatabaseOperationException("Unable to retrieve traffic risk assessments.")

    @staticmethod
    def get_location_risk(db: Session, location_id: str) -> Dict[str, Any]:
        """
        Retrieve risk assessment for a specific location identifier.
        """
        junction = RiskService.parse_junction_id(location_id, db)
        pred = RiskService.get_latest_prediction_for_junction(db, junction)
        canonical_id = RiskService.get_canonical_junction_id(junction)
        is_stale = RiskService.is_prediction_stale(pred)

        return {
            "locationId": str(junction.id),
            "canonicalJunctionId": canonical_id,
            "locationName": junction.name,
            "latitude": junction.latitude,
            "longitude": junction.longitude,
            "riskLevel": pred.risk_level or pred.prediction,
            "riskScore": pred.risk_score if pred.risk_score is not None else 15.0,
            "prediction": pred.prediction,
            "probabilities": {
                "LOW": pred.probability_low or 0.0,
                "MEDIUM": pred.probability_medium or 0.0,
                "HIGH": pred.probability_high or 0.0,
                "CRITICAL": pred.probability_critical or 0.0,
            },
            "modelVersion": pred.model_version or "rf_v1",
            "isMock": pred.is_mock or False,
            "isStale": is_stale,
            "lastEvaluated": pred.timestamp.isoformat() if pred.timestamp else datetime.utcnow().isoformat()
        }

    @staticmethod
    def get_high_risk_junctions(db: Session) -> List[Dict[str, Any]]:
        """Returns junctions with HIGH or CRITICAL risk levels."""
        all_risk = RiskService.get_risk(db)
        return [r for r in all_risk if r["riskLevel"] in ["HIGH", "CRITICAL"]]

    @staticmethod
    def get_critical_risk_junctions(db: Session) -> List[Dict[str, Any]]:
        """Returns junctions with CRITICAL risk levels."""
        all_risk = RiskService.get_risk(db)
        return [r for r in all_risk if r["riskLevel"] == "CRITICAL"]

    @staticmethod
    def get_risk_summary(db: Session) -> Dict[str, Any]:
        """
        GET /api/v1/risk/summary
        Returns aggregated city-wide risk statistics for dashboard header KPIs.
        """
        all_risk = RiskService.get_risk(db)
        total = len(all_risk)
        low_cnt = sum(1 for r in all_risk if r["riskLevel"] == "LOW")
        med_cnt = sum(1 for r in all_risk if r["riskLevel"] == "MEDIUM")
        high_cnt = sum(1 for r in all_risk if r["riskLevel"] == "HIGH")
        crit_cnt = sum(1 for r in all_risk if r["riskLevel"] == "CRITICAL")
        avg_score = (sum(r["riskScore"] for r in all_risk) / total) if total > 0 else 0.0

        return {
            "total_junctions": total,
            "low": low_cnt,
            "medium": med_cnt,
            "high": high_cnt,
            "critical": crit_cnt,
            "average_risk_score": round(avg_score, 2),
            "last_updated": datetime.utcnow().isoformat()
        }

    @staticmethod
    def get_risk_history(db: Session, location_id: str, limit: int = 20) -> Dict[str, Any]:
        """
        GET /api/v1/risk/history/{junction_id}
        Returns historical timeline of risk scores and levels for a junction.
        """
        junction = RiskService.parse_junction_id(location_id, db)
        preds = (
            db.query(Prediction)
            .filter(Prediction.junction_id == junction.id)
            .order_by(Prediction.timestamp.desc())
            .limit(limit)
            .all()
        )

        history_items = []
        for p in reversed(preds):
            history_items.append({
                "timestamp": p.timestamp.isoformat() if p.timestamp else datetime.utcnow().isoformat(),
                "risk_score": p.risk_score or (100.0 if p.risk_level == "CRITICAL" else 70.0 if p.risk_level == "HIGH" else 35.0 if p.risk_level == "MEDIUM" else 15.0),
                "risk_level": p.risk_level or p.prediction,
                "probabilities": {
                    "LOW": p.probability_low or 0.0,
                    "MEDIUM": p.probability_medium or 0.0,
                    "HIGH": p.probability_high or 0.0,
                    "CRITICAL": p.probability_critical or 0.0,
                }
            })

        return {
            "junction_id": str(junction.id),
            "canonicalJunctionId": RiskService.get_canonical_junction_id(junction),
            "junction_name": junction.name,
            "history": history_items
        }


risk_service = RiskService()
