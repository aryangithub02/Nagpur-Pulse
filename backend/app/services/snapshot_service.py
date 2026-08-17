import copy
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.police_unit import PoliceUnit
from app.models.incident import Incident
from app.models.junction import Junction
from app.services.operational_priority_service import operational_priority_service
from app.services.police_unit_service import police_unit_service
from app.services.weather_service import weather_service

logger = logging.getLogger("snapshot_service")

# Global In-Memory Frozen Snapshots Store
SNAPSHOT_CACHE: Dict[str, Dict[str, Any]] = {}
LATEST_SNAPSHOT_IDS: Dict[str, str] = {}


class SnapshotService:
    """
    SnapshotService provides frozen, immutable operational snapshots for What-If resource simulations.
    Ensures simulations execute against an isolated, frozen state without half-read changing live data.
    """

    @staticmethod
    def create_snapshot(db: Session, zone_code: str = "ALL") -> Dict[str, Any]:
        """
        Creates an immutable snapshot of current live operational system state.
        """
        now = datetime.utcnow()
        now_iso = now.isoformat()
        snapshot_seq = len(SNAPSHOT_CACHE) + 100
        snapshot_id = f"SNAP-{snapshot_seq:05d}"

        # 1. Fetch Police Units
        all_units = police_unit_service.get_units(db, zone_code=zone_code if zone_code != "ALL" else None)
        units_snapshot = [
            {
                "id": u.id,
                "name": u.name,
                "type": getattr(u, "unit_type", "PATROL"),
                "badge_number": getattr(u, "badge_number", "PCR-01"),
                "status": u.status,
                "latitude": u.latitude,
                "longitude": u.longitude,
                "zone_code": getattr(u, "zone_code", "CENTRAL") or "CENTRAL",
                "officer_in_charge": getattr(u, "name", "Officer"),
                "contact_number": getattr(u, "badge_number", "100"),
                "capabilities": [],
            }
            for u in all_units
        ]

        if not units_snapshot:
            units_snapshot = [
                {"id": "PU001", "name": "PCR Central Unit 1", "type": "PATROL", "status": "AVAILABLE", "latitude": 21.1458, "longitude": 79.0882, "zone_code": "CENTRAL"},
                {"id": "PU002", "name": "PCR Central Unit 2", "type": "PATROL", "status": "AVAILABLE", "latitude": 21.1490, "longitude": 79.0910, "zone_code": "CENTRAL"},
                {"id": "PU005", "name": "PCR North Unit 1", "type": "PATROL", "status": "AVAILABLE", "latitude": 21.1600, "longitude": 79.0800, "zone_code": "NORTH"},
            ]

        # 2. Fetch Operational Priority Demands
        demands = operational_priority_service.compute_demands(db)
        if zone_code != "ALL":
            demands_snapshot = [d for d in demands if d.get("zone_code") == zone_code]
        else:
            demands_snapshot = copy.deepcopy(demands)

        if not demands_snapshot:
            demands_snapshot = [
                {"location_id": 17, "location_name": "J-17 Variety Sq", "latitude": 21.1458, "longitude": 79.0882, "priority_score": 88.5, "risk_score": 85.0, "risk_class": "CRITICAL", "traffic_congestion_score": 75.0, "incident_priority_score": 0.0, "desired_units": 1, "zone_code": "CENTRAL"},
                {"location_id": 8, "location_name": "J-08 Law College Sq", "latitude": 21.1490, "longitude": 79.0750, "priority_score": 82.0, "risk_score": 80.0, "risk_class": "CRITICAL", "traffic_congestion_score": 60.0, "incident_priority_score": 0.0, "desired_units": 1, "zone_code": "CENTRAL"},
                {"location_id": 22, "location_name": "J-22 Indora Sq", "latitude": 21.1700, "longitude": 79.0900, "priority_score": 70.0, "risk_score": 68.0, "risk_class": "HIGH", "traffic_congestion_score": 50.0, "incident_priority_score": 0.0, "desired_units": 1, "zone_code": "NORTH"},
            ]

        # 3. Fetch Active Incidents
        active_incidents_models = (
            db.query(Incident)
            .filter(Incident.status.in_(["REPORTED", "DISPATCHED", "ON_SCENE", "OPEN"]))
            .all()
        )
        incidents_snapshot = [
            {
                "id": f"INC-{inc.id:04d}",
                "db_id": inc.id,
                "incident_type": inc.incident_type,
                "severity": inc.severity,
                "status": inc.status,
                "junction_id": inc.junction_id,
                "latitude": inc.latitude,
                "longitude": inc.longitude,
                "zone_code": getattr(inc, "zone_code", "CENTRAL") or "CENTRAL",
                "reported_at": inc.reported_at.isoformat() if inc.reported_at else now_iso,
                "description": inc.description or "",
            }
            for inc in active_incidents_models
        ]

        # 4. Fetch Weather Overview
        weather_snapshot = weather_service.get_current_weather(db)

        # Build Frozen Immutable Snapshot Payload
        snapshot_payload = {
            "snapshot_id": snapshot_id,
            "created_at": now_iso,
            "traffic_timestamp": now_iso,
            "incident_timestamp": now_iso,
            "risk_timestamp": now_iso,
            "police_timestamp": now_iso,
            "weather_timestamp": now_iso,
            "zone_code": zone_code,
            "units": units_snapshot,
            "demands": demands_snapshot,
            "incidents": incidents_snapshot,
            "weather": weather_snapshot,
            "routes": [],
            "live_state_modified": False,
        }

        # Cache snapshot immutably
        SNAPSHOT_CACHE[snapshot_id] = copy.deepcopy(snapshot_payload)
        LATEST_SNAPSHOT_IDS[zone_code] = snapshot_id

        logger.info(f"FROZEN SNAPSHOT CREATED [{snapshot_id}] with {len(units_snapshot)} units and {len(demands_snapshot)} demand locations.")
        return copy.deepcopy(snapshot_payload)

    @staticmethod
    def get_snapshot(snapshot_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a deep-copied snapshot by snapshot_id.
        """
        if snapshot_id not in SNAPSHOT_CACHE:
            return None
        return copy.deepcopy(SNAPSHOT_CACHE[snapshot_id])

    @staticmethod
    def get_current_live_snapshot_id(db: Session, zone_code: str = "ALL") -> str:
        """
        Gets current live snapshot_id, creating a fresh one if none exists.
        """
        if zone_code in LATEST_SNAPSHOT_IDS:
            return LATEST_SNAPSHOT_IDS[zone_code]
        snapshot = SnapshotService.create_snapshot(db, zone_code=zone_code)
        return snapshot["snapshot_id"]


snapshot_service = SnapshotService()
