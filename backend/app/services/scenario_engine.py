import copy
import logging
from typing import Dict, Any, List, Tuple

logger = logging.getLogger("scenario_engine")

VALID_CHANGE_TYPES = {
    "UNIT_STATUS",
    "UNIT_REMOVED",
    "NEW_INCIDENT",
    "INCIDENT_SEVERITY_CHANGE",
    "ROUTE_UNAVAILABLE",
    "JUNCTION_UNAVAILABLE",
    "TRAFFIC_CHANGE",
    "RISK_CHANGE",
    "UNIT_LOCATION_CHANGE",
}

VALID_UNIT_STATUSES = {"AVAILABLE", "OFFLINE", "PATROLLING", "DISPATCHED", "DEPLOYED"}
VALID_SEVERITIES = {"LOW", "MODERATE", "HIGH", "CRITICAL"}


class ScenarioEngine:
    """
    ScenarioEngine processes, validates, and applies hypothetical scenario changes to an in-memory snapshot.
    Guarantees 100% read-only operations without database or live state side effects.
    """

    @staticmethod
    def validate_changes(snapshot: Dict[str, Any], changes: List[Dict[str, Any]], user_zone: str = "ALL") -> Tuple[bool, List[str]]:
        """
        Validates scenario changes against snapshot resources, allowed ranges, and zone security boundaries.
        """
        errors: List[str] = []
        units_map = {u["id"]: u for u in snapshot.get("units", [])}
        demands_map = {d["location_id"]: d for d in snapshot.get("demands", [])}
        incidents_map = {i["id"]: i for i in snapshot.get("incidents", [])}

        for idx, change in enumerate(changes):
            c_type = change.get("type")
            if not c_type or c_type not in VALID_CHANGE_TYPES:
                errors.append(f"Change #{idx + 1}: Invalid or unsupported scenario type '{c_type}'.")
                continue

            # Zone Authorization Check
            if user_zone != "ALL":
                unit_id = change.get("unit_id")
                if unit_id and unit_id in units_map:
                    u_zone = units_map[unit_id].get("zone_code", "CENTRAL")
                    if u_zone != user_zone:
                        errors.append(f"Change #{idx + 1}: Access denied. Unit '{unit_id}' belongs to {u_zone} zone (User: {user_zone}).")

                j_id = change.get("junction_id")
                if j_id and j_id in demands_map:
                    d_zone = demands_map[j_id].get("zone_code", "CENTRAL")
                    if d_zone != user_zone:
                        errors.append(f"Change #{idx + 1}: Access denied. Junction '{j_id}' belongs to {d_zone} zone (User: {user_zone}).")

            # Detailed Scenario Validation
            if c_type in ("UNIT_STATUS", "UNIT_REMOVED", "UNIT_LOCATION_CHANGE"):
                u_id = change.get("unit_id")
                if not u_id or u_id not in units_map:
                    errors.append(f"Change #{idx + 1}: Police unit '{u_id}' does not exist in base snapshot.")

                if c_type == "UNIT_STATUS":
                    val = change.get("value")
                    if val not in VALID_UNIT_STATUSES:
                        errors.append(f"Change #{idx + 1}: Invalid unit status '{val}'. Must be one of {VALID_UNIT_STATUSES}.")

                elif c_type == "UNIT_LOCATION_CHANGE":
                    lat = change.get("latitude")
                    lng = change.get("longitude")
                    if lat is None or not (15.0 <= float(lat) <= 30.0):
                        errors.append(f"Change #{idx + 1}: Latitude '{lat}' outside valid range (15.0 to 30.0).")
                    if lng is None or not (70.0 <= float(lng) <= 85.0):
                        errors.append(f"Change #{idx + 1}: Longitude '{lng}' outside valid range (70.0 to 85.0).")

            elif c_type == "INCIDENT_SEVERITY_CHANGE":
                inc_id = change.get("incident_id")
                if not inc_id or inc_id not in incidents_map:
                    errors.append(f"Change #{idx + 1}: Incident '{inc_id}' does not exist in snapshot.")
                val = change.get("value")
                if val not in VALID_SEVERITIES:
                    errors.append(f"Change #{idx + 1}: Invalid severity '{val}'. Must be one of {VALID_SEVERITIES}.")

            elif c_type == "NEW_INCIDENT":
                inc_data = change.get("incident", {})
                j_id = inc_data.get("junction_id")
                if j_id and j_id not in demands_map:
                    errors.append(f"Change #{idx + 1}: Target junction ID '{j_id}' for new incident does not exist.")

            elif c_type == "TRAFFIC_CHANGE":
                j_id = change.get("junction_id")
                if not j_id or j_id not in demands_map:
                    errors.append(f"Change #{idx + 1}: Target junction ID '{j_id}' does not exist.")
                cong = change.get("congestion")
                if cong is None or not (0 <= float(cong) <= 100):
                    errors.append(f"Change #{idx + 1}: Congestion '{cong}' outside valid range 0 to 100.")

            elif c_type == "RISK_CHANGE":
                j_id = change.get("junction_id")
                if not j_id or j_id not in demands_map:
                    errors.append(f"Change #{idx + 1}: Target junction ID '{j_id}' does not exist.")
                r_score = change.get("risk_score")
                if r_score is None or not (0 <= float(r_score) <= 100):
                    errors.append(f"Change #{idx + 1}: Risk score '{r_score}' outside valid range 0 to 100.")

            elif c_type == "JUNCTION_UNAVAILABLE":
                j_id = change.get("junction_id")
                if not j_id or j_id not in demands_map:
                    errors.append(f"Change #{idx + 1}: Target junction ID '{j_id}' does not exist.")

        return len(errors) == 0, errors

    @staticmethod
    def apply_changes(snapshot: Dict[str, Any], changes: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Applies changes to a deep-copied in-memory snapshot and recalculates operational demands.
        """
        state = copy.deepcopy(snapshot)
        units_list = state.get("units", [])
        demands_list = state.get("demands", [])
        incidents_list = state.get("incidents", [])

        unavailable_routes = state.get("unavailable_routes", [])
        unavailable_junctions = state.get("unavailable_junctions", [])

        applied_summary = []

        for change in changes:
            c_type = change.get("type")

            if c_type == "UNIT_STATUS":
                u_id = change.get("unit_id")
                new_status = change.get("value")
                for u in units_list:
                    if u["id"] == u_id:
                        old_s = u["status"]
                        u["status"] = new_status
                        applied_summary.append({
                            "type": c_type,
                            "target": u_id,
                            "from": old_s,
                            "to": new_status,
                            "description": f"Unit {u_id} status changed from {old_s} to {new_status}."
                        })

            elif c_type == "UNIT_REMOVED":
                u_id = change.get("unit_id")
                units_list[:] = [u for u in units_list if u["id"] != u_id]
                applied_summary.append({
                    "type": c_type,
                    "target": u_id,
                    "description": f"Unit {u_id} temporarily removed from allocation candidate pool."
                })

            elif c_type == "UNIT_LOCATION_CHANGE":
                u_id = change.get("unit_id")
                lat = float(change.get("latitude"))
                lng = float(change.get("longitude"))
                for u in units_list:
                    if u["id"] == u_id:
                        u["latitude"] = lat
                        u["longitude"] = lng
                        applied_summary.append({
                            "type": c_type,
                            "target": u_id,
                            "to": f"({lat:.4f}, {lng:.4f})",
                            "description": f"Unit {u_id} GPS location moved to ({lat:.4f}, {lng:.4f})."
                        })

            elif c_type == "NEW_INCIDENT":
                inc_data = change.get("incident", {})
                j_id = inc_data.get("junction_id")
                sev = inc_data.get("severity", "HIGH")
                inc_type = inc_data.get("incident_type", "ACCIDENT")
                lat = inc_data.get("latitude")
                lng = inc_data.get("longitude")

                # If lat/lng missing, pick from junction
                if (lat is None or lng is None) and j_id:
                    for d in demands_list:
                        if d["location_id"] == j_id:
                            lat = d["latitude"]
                            lng = d["longitude"]
                            break

                sim_inc_id = f"SIM-INC-{len(incidents_list)+1:03d}"
                incidents_list.append({
                    "id": sim_inc_id,
                    "incident_type": inc_type,
                    "severity": sev,
                    "status": "OPEN",
                    "junction_id": j_id,
                    "latitude": lat or 21.145,
                    "longitude": lng or 79.088,
                    "zone_code": "CENTRAL",
                    "description": "Hypothetical Simulation Incident",
                })

                # Increase demand priority for target junction
                if j_id:
                    for d in demands_list:
                        if d["location_id"] == j_id:
                            d["incident_priority_score"] = max(d.get("incident_priority_score", 0.0), 90.0 if sev == "CRITICAL" else 75.0)
                            d["priority_score"] = round(min(100.0, d["priority_score"] + (30.0 if sev == "CRITICAL" else 20.0)), 1)
                            d["desired_units"] = max(d.get("desired_units", 1), 2 if sev == "CRITICAL" else 1)

                applied_summary.append({
                    "type": c_type,
                    "target": sim_inc_id,
                    "junction_id": j_id,
                    "severity": sev,
                    "description": f"Simulated new {sev} {inc_type} incident at Junction {j_id}."
                })

            elif c_type == "INCIDENT_SEVERITY_CHANGE":
                inc_id = change.get("incident_id")
                new_sev = change.get("value")
                j_target = None
                for i in incidents_list:
                    if i["id"] == inc_id:
                        old_sev = i["severity"]
                        i["severity"] = new_sev
                        j_target = i.get("junction_id")
                        applied_summary.append({
                            "type": c_type,
                            "target": inc_id,
                            "from": old_sev,
                            "to": new_sev,
                            "description": f"Incident {inc_id} severity updated from {old_sev} to {new_sev}."
                        })

                if j_target:
                    for d in demands_list:
                        if d["location_id"] == j_target:
                            d["incident_priority_score"] = 95.0 if new_sev == "CRITICAL" else 60.0
                            d["priority_score"] = round(min(100.0, d["priority_score"] + 25.0), 1)

            elif c_type == "TRAFFIC_CHANGE":
                j_id = change.get("junction_id")
                cong = float(change.get("congestion"))
                for d in demands_list:
                    if d["location_id"] == j_id:
                        old_c = d.get("traffic_congestion_score", 50.0)
                        d["traffic_congestion_score"] = cong
                        # Recalculate priority score in-memory
                        d["priority_score"] = round(0.4 * d["risk_score"] + 0.35 * cong + 0.25 * d.get("incident_priority_score", 0.0), 1)
                        applied_summary.append({
                            "type": c_type,
                            "target": j_id,
                            "from": old_c,
                            "to": cong,
                            "description": f"Junction {j_id} congestion set to {cong}%."
                        })

            elif c_type == "RISK_CHANGE":
                j_id = change.get("junction_id")
                r_score = float(change.get("risk_score"))
                r_class = change.get("risk_class", "CRITICAL" if r_score >= 85 else ("HIGH" if r_score >= 70 else "MODERATE"))
                for d in demands_list:
                    if d["location_id"] == j_id:
                        old_r = d.get("risk_score", 50.0)
                        d["risk_score"] = r_score
                        d["risk_class"] = r_class
                        d["priority_score"] = round(0.4 * r_score + 0.35 * d.get("traffic_congestion_score", 50.0) + 0.25 * d.get("incident_priority_score", 0.0), 1)
                        applied_summary.append({
                            "type": c_type,
                            "target": j_id,
                            "from": old_r,
                            "to": r_score,
                            "description": f"Junction {j_id} risk score updated to {r_score} ({r_class})."
                        })

            elif c_type == "ROUTE_UNAVAILABLE":
                r_id = change.get("route_id") or f"ROUTE_{change.get('unit_id')}_{change.get('junction_id')}"
                unavailable_routes.append(r_id)
                applied_summary.append({
                    "type": c_type,
                    "target": r_id,
                    "description": f"Route '{r_id}' marked unavailable."
                })

            elif c_type == "JUNCTION_UNAVAILABLE":
                j_id = change.get("junction_id")
                unavailable_junctions.append(j_id)
                applied_summary.append({
                    "type": c_type,
                    "target": j_id,
                    "description": f"Junction {j_id} marked inaccessible/unavailable."
                })

        state["units"] = units_list
        state["demands"] = demands_list
        state["incidents"] = incidents_list
        state["unavailable_routes"] = unavailable_routes
        state["unavailable_junctions"] = unavailable_junctions
        state["changes_applied_summary"] = applied_summary
        return state


scenario_engine = ScenarioEngine()
