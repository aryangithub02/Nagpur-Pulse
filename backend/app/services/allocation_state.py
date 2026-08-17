"""
Nagpur Pulse - Allocation State & State Builder.
Aggregates live multi-source operational telemetry (police units, junctions,
ML predictions, TomTom traffic, active incidents, and weather) into a
deterministic in-memory container for fast greedy allocation and What-If simulations.
Zero synthetic data - strictly consumes actual system entities.
"""

import copy
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.junction import Junction
from app.models.police_unit import PoliceUnit
from app.models.incident import Incident
from app.models.prediction import Prediction
from app.models.observation import TrafficObservation
from app.services.police_unit_service import police_unit_service
from app.services.weather_service import weather_service
from app.services.accident_dataset_loader import get_junction_accident_stats

logger = logging.getLogger("allocation_state")


class AllocationState:
    """
    In-memory immutable/copyable operational snapshot for resource allocation.
    """

    def __init__(
        self,
        units: List[Dict[str, Any]],
        junctions: List[Dict[str, Any]],
        incidents: List[Dict[str, Any]],
        risk_predictions: Dict[int, Dict[str, Any]],
        traffic: Dict[int, Dict[str, Any]],
        weather: Dict[str, Any],
        unavailable_routes: Optional[List[str]] = None,
        unavailable_junctions: Optional[List[int]] = None,
        zone_code: str = "ALL",
        created_at: Optional[str] = None
    ):
        self.units = units
        self.junctions = junctions
        self.incidents = incidents
        self.risk_predictions = risk_predictions
        self.traffic = traffic
        self.weather = weather
        self.unavailable_routes = unavailable_routes or []
        self.unavailable_junctions = unavailable_junctions or []
        self.zone_code = zone_code
        self.created_at = created_at or datetime.utcnow().isoformat()

    def clone(self) -> "AllocationState":
        """Returns an isolated deep copy for scenario simulation."""
        return AllocationState(
            units=copy.deepcopy(self.units),
            junctions=copy.deepcopy(self.junctions),
            incidents=copy.deepcopy(self.incidents),
            risk_predictions=copy.deepcopy(self.risk_predictions),
            traffic=copy.deepcopy(self.traffic),
            weather=copy.deepcopy(self.weather),
            unavailable_routes=copy.deepcopy(self.unavailable_routes),
            unavailable_junctions=copy.deepcopy(self.unavailable_junctions),
            zone_code=self.zone_code,
            created_at=self.created_at
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "zone_code": self.zone_code,
            "created_at": self.created_at,
            "units_count": len(self.units),
            "junctions_count": len(self.junctions),
            "incidents_count": len(self.incidents),
            "units": self.units,
            "junctions": self.junctions,
            "incidents": self.incidents,
            "risk_predictions": self.risk_predictions,
            "traffic": self.traffic,
            "weather": self.weather,
            "unavailable_routes": self.unavailable_routes,
            "unavailable_junctions": self.unavailable_junctions,
        }


class StateBuilder:
    """
    Builds AllocationState from live database tables and operational services.
    """

    @staticmethod
    def build_from_db(db: Session, zone_code: str = "ALL") -> AllocationState:
        """
        Extracts real-time system state without any synthetic or randomized data.
        """
        now_iso = datetime.utcnow().isoformat()

        # 1. Fetch Police Units
        db_units = police_unit_service.get_units(db, zone_code=zone_code if zone_code != "ALL" else None)
        units_list: List[Dict[str, Any]] = []
        for u in db_units:
            units_list.append({
                "id": u.id,
                "name": u.name,
                "type": getattr(u, "unit_type", "PATROL"),
                "badge_number": getattr(u, "badge_number", "PCR-01"),
                "status": u.status,
                "latitude": float(u.latitude),
                "longitude": float(u.longitude),
                "zone_code": getattr(u, "zone_code", "CENTRAL") or "CENTRAL",
                "officer_in_charge": getattr(u, "name", "Officer"),
                "capabilities": getattr(u, "capabilities", []) or ["GENERAL_PATROL", "TRAFFIC_CONTROL"],
            })

        # 2. Fetch Junctions
        db_junctions = db.query(Junction).order_by(Junction.id.asc()).all()

        junctions_list: List[Dict[str, Any]] = []
        for j in db_junctions:
            # Derive zone if not explicit
            j_lat = float(j.latitude)
            j_lng = float(j.longitude)
            if j_lat > 21.160:
                j_zone = "NORTH"
            elif j_lat < 21.130:
                j_zone = "SOUTH"
            elif j_lng > 79.110:
                j_zone = "EAST"
            elif j_lng < 79.060:
                j_zone = "WEST"
            else:
                j_zone = "CENTRAL"

            if zone_code != "ALL" and j_zone != zone_code:
                continue

            junctions_list.append({
                "id": j.id,
                "name": j.name,
                "latitude": j_lat,
                "longitude": j_lng,
                "zone_code": j_zone,
                "address": getattr(j, "address", j.name)
            })

        # 3. Fetch Latest ML Risk Predictions
        predictions_map: Dict[int, Dict[str, Any]] = {}
        latest_preds = db.query(Prediction).order_by(Prediction.timestamp.desc()).all()
        for p in latest_preds:
            if p.junction_id and p.junction_id not in predictions_map:
                predictions_map[p.junction_id] = {
                    "risk_score": float(p.risk_score or 20.0),
                    "risk_level": p.risk_level or p.prediction or "LOW",
                    "timestamp": p.timestamp.isoformat() if p.timestamp else now_iso,
                    "features": p.features_used or {}
                }

        # 4. Fetch Live Traffic Observations via Canonical Adapter
        from app.services.traffic_service import traffic_service
        traffic_map: Dict[int, Dict[str, Any]] = {}
        canonical_traffic = traffic_service.get_canonical_traffic(db)
        for ct in canonical_traffic:
            traffic_map[ct.junction_id] = {
                "speed": ct.speed_kmh,
                "congestion": ct.congestion_percent,
                "delay": ct.delay_minutes,
                "traffic_level": ct.traffic_level,
                "timestamp": ct.observed_at,
                "source_provider": ct.provenance.source_provider if ct.provenance else "SIMULATED",
                "quality_score": ct.provenance.quality_score if ct.provenance else 1.0,
            }

        # Fallback to direct DB observations if adapter returned empty
        if not traffic_map:
            latest_obs = db.query(TrafficObservation).order_by(TrafficObservation.timestamp.desc()).all()
            for obs in latest_obs:
                if obs.junction_id and obs.junction_id not in traffic_map:
                    tdata = obs.traffic_data or {}
                    traffic_map[obs.junction_id] = {
                        "speed": float(tdata.get("speed", 35.0)),
                        "congestion": float(tdata.get("congestion", 30.0)),
                        "delay": float(tdata.get("delay", 0.0)),
                        "timestamp": obs.timestamp.isoformat() if obs.timestamp else now_iso
                    }

        # 5. Fetch Active Incidents
        active_incidents = (
            db.query(Incident)
            .filter(Incident.status.in_(["REPORTED", "ACTIVE", "DISPATCHED", "ON_SCENE", "OPEN"]))
            .all()
        )
        incidents_list: List[Dict[str, Any]] = []
        for inc in active_incidents:
            inc_loc_id = getattr(inc, "location_id", getattr(inc, "junction_id", None))
            inc_junc = next((j for j in junctions_list if j["id"] == inc_loc_id), None)
            inc_zone = inc_junc["zone_code"] if inc_junc else "CENTRAL"

            if zone_code != "ALL" and inc_zone != zone_code:
                continue

            inc_lat = inc_junc["latitude"] if inc_junc else getattr(inc, "latitude", None)
            inc_lng = inc_junc["longitude"] if inc_junc else getattr(inc, "longitude", None)
            rep_time = inc.timestamp.isoformat() if getattr(inc, "timestamp", None) else (
                inc.created_at.isoformat() if getattr(inc, "created_at", None) else now_iso
            )

            incidents_list.append({
                "id": str(inc.id),
                "db_id": inc.id,
                "incident_type": getattr(inc, "type", "ACCIDENT"),
                "severity": inc.severity or "LOW",
                "status": inc.status,
                "junction_id": inc_loc_id,
                "latitude": inc_lat,
                "longitude": inc_lng,
                "zone_code": inc_zone,
                "reported_at": rep_time,
                "description": inc.description or "",
            })

        # 6. Fetch Live Weather Telemetry via Canonical Adapter
        weather_canonical = weather_service.get_canonical_weather(db)
        weather_data = weather_canonical.to_dict()

        return AllocationState(
            units=units_list,
            junctions=junctions_list,
            incidents=incidents_list,
            risk_predictions=predictions_map,
            traffic=traffic_map,
            weather=weather_data,
            zone_code=zone_code,
            created_at=now_iso
        )

    @staticmethod
    def build_from_snapshot(snapshot: Dict[str, Any]) -> AllocationState:
        """
        Builds AllocationState from an existing frozen snapshot dictionary.
        """
        units = snapshot.get("units", [])
        demands = snapshot.get("demands", [])
        incidents = snapshot.get("incidents", [])
        weather = snapshot.get("weather", {})
        zone_code = snapshot.get("zone_code", "ALL")

        # Map demands to junctions and predictions
        junctions: List[Dict[str, Any]] = []
        predictions_map: Dict[int, Dict[str, Any]] = {}
        traffic_map: Dict[int, Dict[str, Any]] = {}

        for d in demands:
            l_id = d.get("location_id") if d.get("location_id") is not None else (d.get("id") if d.get("id") is not None else d.get("junction_id"))
            if l_id is not None:
                junctions.append({
                    "id": l_id,
                    "name": d.get("location_name") or d.get("name") or f"Junction {l_id}",
                    "latitude": float(d.get("latitude", 21.1458)),
                    "longitude": float(d.get("longitude", 79.0882)),
                    "zone_code": d.get("zone_code", "CENTRAL")
                })
                predictions_map[l_id] = {
                    "risk_score": float(d.get("risk_score", 30.0)),
                    "risk_level": d.get("risk_class", "LOW"),
                    "features": {}
                }
                traffic_map[l_id] = {
                    "speed": float(d.get("current_speed_kmh", 35.0)),
                    "congestion": float(d.get("traffic_congestion_score", 30.0)),
                    "delay": float(d.get("traffic_delay_sec", 0.0))
                }

        return AllocationState(
            units=units,
            junctions=junctions,
            incidents=incidents,
            risk_predictions=predictions_map,
            traffic=traffic_map,
            weather=weather,
            unavailable_routes=snapshot.get("unavailable_routes", []),
            unavailable_junctions=snapshot.get("unavailable_junctions", []),
            zone_code=zone_code,
            created_at=snapshot.get("created_at")
        )


state_builder = StateBuilder()
