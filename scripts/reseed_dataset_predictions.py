"""
Fast Dataset-Driven Bulk Reseeding Script.
"""

import sys
import logging
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from app.database import SessionLocal
from app.models.junction import Junction
from app.models.prediction import Prediction
from app.services.risk_service import risk_service
from app.services.accident_dataset_loader import get_junction_accident_stats
from app.services.weather_service import weather_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ReseedFast")


def main():
    logger.info("Starting Fast Bulk Prediction Reseeding for all Nagpur Chowks...")
    db = SessionLocal()
    try:
        # Pre-fetch weather once
        curr_w = weather_service.get_current_weather()
        w_impact = curr_w["traffic_impact"]["score"]
        w = curr_w["weather"]

        junctions = db.query(Junction).order_by(Junction.id.asc()).all()
        logger.info(f"Loaded {len(junctions)} junctions from Neon DB.")

        count = 0
        from ml.inference.predictor import RiskPredictor
        predictor = RiskPredictor()

        for j in junctions:
            ds = get_junction_accident_stats(j.name)
            base_total = float(ds.get("total_accidents", 35))
            base_injuries = float(ds.get("injuries", 45))
            base_fatalities = float(ds.get("fatalities", 2))
            base_7d = float(ds.get("accidents_7d", 1))
            base_30d = float(ds.get("accidents_30d", 3))

            features = {
                "junction_id": j.id,
                "month": datetime.utcnow().month,
                "total_accidents": base_total,
                "injury_accidents": base_injuries,
                "fatal_accidents": base_fatalities,
                "accidents_7d": base_7d,
                "accidents_30d": base_30d,
                "accidents_90d": round(base_30d * 2.5, 1),
                "accidents_1y": round(base_total * 0.4, 1),
                "accidents_lag_1": base_7d,
                "accidents_rolling_mean_3": round(base_30d / 3.0, 2),
                "accidents_rolling_mean_6": round(base_30d / 3.0, 2),
                "historical_accident_rate": round(base_30d / 12.0, 2),
                "junction_target_enc": float(j.id % 4),
                "junction_ordinal_enc": float(j.id),
                "speed": 35.0,
                "density": 100.0,
                "congestion": 45.0,
                "temperature_c": float(w.get("temperature_c", 26.0)),
                "humidity_pct": float(w.get("humidity_pct", 85.0)),
                "precipitation_mm": float(w.get("precipitation_mm", 0.0)),
                "visibility_km": float(w.get("visibility_km", 10.0)),
                "wind_speed_kmh": float(w.get("wind_speed_kmh", 10.0)),
                "storm_flag": 1.0 if w.get("storm_flag", False) else 0.0,
                "weather_impact_score": w_impact,
            }

            p_res = predictor.predict(features)
            raw_score = p_res.get("risk_score", 15.0)
            risk_level = p_res.get("predicted_class", "LOW")

            pred = Prediction(
                junction_id=j.id,
                timestamp=datetime.utcnow(),
                prediction=risk_level,
                risk_level=risk_level,
                risk_score=raw_score,
                probability_low=p_res.get("probabilities", {}).get("LOW", 0.0),
                probability_medium=p_res.get("probabilities", {}).get("MEDIUM", 0.0),
                probability_high=p_res.get("probabilities", {}).get("HIGH", 0.0),
                probability_critical=p_res.get("probabilities", {}).get("CRITICAL", 0.0),
                model_version=p_res.get("model_version", "rf_v3_weather"),
                features_used=features,
                is_mock=False,
            )
            db.add(pred)
            count += 1
            logger.info(f"  [{j.id:02d}] {j.name:<32} -> {risk_level:<8} ({raw_score:.1f}%) [Accidents: {base_total:.0f}]")

        db.commit()
        logger.info(f"✅ SUCCESS! Created & saved {count} predictions in Neon PostgreSQL DB!")
    except Exception as e:
        logger.error(f"Error in reseed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
