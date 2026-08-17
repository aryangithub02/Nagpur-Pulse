"""
Nagpur Pulse - Resource Allocation Service.
Uses Google OR-Tools CP-SAT solver to perform global optimal allocation of limited Police/PCR units to high-priority demand locations.
Supports deterministic in-memory execution for What-If resource simulations.
"""

import time
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ortools.sat.python import cp_model

from app.models.police_unit import PoliceUnit
from app.models.optimization_run import OptimizationRun
from app.models.allocation_assignment import AllocationAssignment
from app.services.police_unit_service import police_unit_service
from app.services.operational_priority_service import (
    operational_priority_service,
    DEFAULT_PRIORITY_WEIGHTS
)
from app.services.routing_service import haversine_distance_km, estimate_travel_time_minutes

logger = logging.getLogger("resource_allocation_service")


class ResourceAllocationService:
    """Orchestrates Google OR-Tools CP-SAT resource allocation solver for live and simulation runs."""

    @staticmethod
    def run_optimization_on_state(
        units: List[Dict[str, Any]],
        demands: List[Dict[str, Any]],
        unavailable_routes: Optional[List[str]] = None,
        unavailable_junctions: Optional[List[int]] = None,
        max_eta_minutes: float = 15.0,
        include_patrolling: bool = False,
        weights: Optional[Dict[str, float]] = None,
        solver_time_limit: float = 3.0,
        opt_id_prefix: str = "opt"
    ) -> Dict[str, Any]:
        """
        Executes Google OR-Tools CP-SAT optimization deterministically on an explicit in-memory state.
        Safe for both live system execution and What-If scenario simulations.
        """
        start_time = time.time()
        opt_id = f"{opt_id_prefix}_{uuid.uuid4().hex[:10]}"
        unavailable_routes_set = set(unavailable_routes or [])
        unavailable_junc_set = set(unavailable_junctions or [])

        # 1. Filter Eligible Police Units
        eligible_statuses = ["AVAILABLE"]
        if include_patrolling:
            eligible_statuses.append("PATROLLING")

        available_units = [u for u in units if u.get("status") in eligible_statuses]
        active_demands = [d for d in demands if d.get("location_id") not in unavailable_junc_set and d.get("desired_units", 0) > 0]

        # 2. Build Candidate Assignment Matrix (u, l)
        candidate_pairs: List[Dict[str, Any]] = []
        unit_candidates: Dict[str, List[int]] = {u["id"]: [] for u in available_units}
        location_candidates: Dict[int, List[str]] = {d["location_id"]: [] for d in active_demands}
        pair_value_map: Dict[str, Dict[str, Any]] = {}

        for u in available_units:
            u_id = u["id"]
            u_lat = float(u["latitude"])
            u_lng = float(u["longitude"])

            for d in active_demands:
                l_id = d["location_id"]
                route_key = f"ROUTE_{u_id}_{l_id}"
                alt_route_key = f"ROUTE_{l_id}_{u_id}"
                if route_key in unavailable_routes_set or alt_route_key in unavailable_routes_set:
                    continue

                d_lat = float(d["latitude"])
                d_lng = float(d["longitude"])
                dist = haversine_distance_km(u_lat, u_lng, d_lat, d_lng)
                eta = estimate_travel_time_minutes(dist)

                if eta <= max_eta_minutes:
                    effectiveness = 1.0 / (1.0 + 0.08 * eta)
                    assignment_val = round(d["priority_score"] * effectiveness, 2)

                    pair_info = {
                        "unit_id": u_id,
                        "unit_name": u.get("name", u_id),
                        "location_id": l_id,
                        "location_name": d.get("location_name", f"Junction {l_id}"),
                        "priority_score": d["priority_score"],
                        "risk_score": d.get("risk_score", 50.0),
                        "risk_class": d.get("risk_class", "MODERATE"),
                        "traffic_congestion_score": d.get("traffic_congestion_score", 50.0),
                        "incident_priority_score": d.get("incident_priority_score", 0.0),
                        "coverage_gap_score": d.get("coverage_gap_score", 0.0),
                        "distance_km": dist,
                        "eta_minutes": eta,
                        "assignment_value": assignment_val,
                    }

                    candidate_pairs.append(pair_info)
                    unit_candidates[u_id].append(l_id)
                    location_candidates[l_id].append(u_id)
                    pair_value_map[f"{u_id}_{l_id}"] = pair_info

        # 3. Formulate OR-Tools CP-SAT Model
        model = cp_model.CpModel()
        x: Dict[str, cp_model.BoolVar] = {}

        for p in candidate_pairs:
            u_id = p["unit_id"]
            l_id = p["location_id"]
            x[f"{u_id}_{l_id}"] = model.NewBoolVar(f"x_{u_id}_{l_id}")

        # Constraint 1: Each unit assigned to AT MOST ONE location
        for u in available_units:
            u_id = u["id"]
            u_vars = [x[f"{u_id}_{l_id}"] for l_id in unit_candidates[u_id]]
            if u_vars:
                model.Add(sum(u_vars) <= 1)

        # Constraint 2: Each location receives AT MOST desired_units
        for d in active_demands:
            l_id = d["location_id"]
            l_vars = [x[f"{u_id}_{l_id}"] for u_id in location_candidates[l_id]]
            if l_vars:
                model.Add(sum(l_vars) <= d.get("desired_units", 1))

        # Objective: Maximize total integer-scaled operational assignment value
        objective_terms = [
            int(p["assignment_value"] * 1000) * x[f"{p['unit_id']}_{p['location_id']}"]
            for p in candidate_pairs
        ]
        if objective_terms:
            model.Maximize(sum(objective_terms))

        # 4. Solve CP-SAT Model
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = solver_time_limit
        solver.parameters.num_search_workers = 4

        solve_status_raw = solver.Solve(model)
        solve_time = round(time.time() - start_time, 3)

        if solve_status_raw == cp_model.OPTIMAL:
            status_str = "OPTIMAL"
        elif solve_status_raw == cp_model.FEASIBLE:
            status_str = "FEASIBLE"
        elif solve_status_raw == cp_model.INFEASIBLE:
            status_str = "INFEASIBLE"
        else:
            status_str = "UNKNOWN"

        # 5. Parse Solution & Assignments
        assignments: List[Dict[str, Any]] = []
        assigned_units: set = set()
        assigned_locations: Dict[int, int] = {}

        if status_str in ("OPTIMAL", "FEASIBLE"):
            for p in candidate_pairs:
                u_id = p["unit_id"]
                l_id = p["location_id"]
                var_key = f"{u_id}_{l_id}"
                if solver.Value(x[var_key]) == 1:
                    assigned_units.add(u_id)
                    assigned_locations[l_id] = assigned_locations.get(l_id, 0) + 1

                    assignments.append({
                        "optimization_id": opt_id,
                        "unit_id": u_id,
                        "location_id": l_id,
                        "location_name": p["location_name"],
                        "risk_score": p["risk_score"],
                        "risk_class": p["risk_class"],
                        "traffic_congestion_score": p["traffic_congestion_score"],
                        "incident_priority_score": p["incident_priority_score"],
                        "coverage_gap_score": p["coverage_gap_score"],
                        "distance_km": p["distance_km"],
                        "eta_minutes": p["eta_minutes"],
                        "assignment_value": p["assignment_value"],
                        "status": "RECOMMENDED",
                        "reason": f"Optimal assignment value {p['assignment_value']} (ETA: {p['eta_minutes']} min, Priority: {p['priority_score']})",
                    })

        assignments.sort(key=lambda a: a["assignment_value"], reverse=True)

        # 6. Unallocated Units
        unallocated_units: List[Dict[str, Any]] = []
        for u in available_units:
            u_id = u["id"]
            if u_id not in assigned_units:
                unallocated_units.append({
                    "unit_id": u_id,
                    "unit_name": u.get("name", u_id),
                    "status": u.get("status", "AVAILABLE"),
                    "latitude": u.get("latitude"),
                    "longitude": u.get("longitude"),
                    "reason": "No location assignment produced higher global operational value within max ETA limits.",
                })

        # 7. Uncovered Locations & Coverage Metrics
        uncovered_locations: List[Dict[str, Any]] = []
        shortage_score = 0
        total_demand_priority = sum(d["priority_score"] for d in demands)
        covered_demand_priority = 0.0

        for d in demands:
            l_id = d["location_id"]
            assigned_cnt = assigned_locations.get(l_id, 0)
            if assigned_cnt > 0:
                covered_demand_priority += d["priority_score"]
            elif d.get("desired_units", 1) > 0:
                shortage_score += d.get("desired_units", 1)
                reason = "All available compatible units allocated to higher operational priority locations."
                if l_id in unavailable_junc_set:
                    reason = "Junction marked unavailable in scenario."
                elif not location_candidates.get(l_id):
                    reason = f"No available police unit located within maximum response ETA limit ({max_eta_minutes} min)."

                uncovered_locations.append({
                    "location_id": l_id,
                    "location_name": d.get("location_name", f"Junction {l_id}"),
                    "risk_score": d.get("risk_score", 50.0),
                    "risk_class": d.get("risk_class", "MODERATE"),
                    "priority_score": d["priority_score"],
                    "traffic_congestion_score": d.get("traffic_congestion_score", 50.0),
                    "incident_priority_score": d.get("incident_priority_score", 0.0),
                    "desired_units": d.get("desired_units", 1),
                    "assigned_units": assigned_cnt,
                    "reason": reason,
                })

        risk_weighted_coverage = round(
            (covered_demand_priority / max(1.0, total_demand_priority)) * 100.0, 1
        )
        resource_utilization = round(
            (len(assigned_units) / max(1, len(available_units))) * 100.0, 1
        )
        objective_val = round(solver.ObjectiveValue() / 1000.0, 2) if status_str in ("OPTIMAL", "FEASIBLE") else 0.0

        config_data = {
            "max_eta_minutes": max_eta_minutes,
            "include_patrolling": include_patrolling,
            "solver_time_limit": solver_time_limit,
            "weights": weights or DEFAULT_PRIORITY_WEIGHTS,
        }

        return {
            "optimization_id": opt_id,
            "generated_at": datetime.utcnow().isoformat(),
            "solver": "Google OR-Tools CP-SAT",
            "status": status_str,
            "objective_value": objective_val,
            "solver_time_seconds": solve_time,
            "available_units": len(available_units),
            "allocated_units": len(assigned_units),
            "unallocated_units_count": len(unallocated_units),
            "total_demand_locations": len(demands),
            "covered_locations": len(assigned_locations),
            "uncovered_locations_count": len(uncovered_locations),
            "risk_weighted_coverage_pct": risk_weighted_coverage,
            "resource_utilization_pct": resource_utilization,
            "resource_shortage_score": shortage_score,
            "assignments": assignments,
            "unallocated_units": unallocated_units,
            "uncovered_locations": uncovered_locations,
            "configuration": config_data,
        }

    @staticmethod
    def run_optimization(
        db: Session,
        max_eta_minutes: float = 15.0,
        include_patrolling: bool = False,
        weights: Optional[Dict[str, float]] = None,
        solver_time_limit: float = 3.0
    ) -> Dict[str, Any]:
        """
        Executes live OR-Tools CP-SAT optimization to allocate police units to demand locations and persists run to DB.
        """
        # 1. Fetch live police units
        units_models = db.query(PoliceUnit).order_by(PoliceUnit.id.asc()).all()
        units_data = [
            {
                "id": u.id,
                "name": u.name,
                "status": u.status,
                "latitude": u.latitude,
                "longitude": u.longitude,
            }
            for u in units_models
        ]

        # 2. Fetch live demands
        demands = operational_priority_service.compute_demands(db, weights=weights)

        # 3. Run in-memory solver
        result = ResourceAllocationService.run_optimization_on_state(
            units=units_data,
            demands=demands,
            max_eta_minutes=max_eta_minutes,
            include_patrolling=include_patrolling,
            weights=weights,
            solver_time_limit=solver_time_limit,
            opt_id_prefix="opt"
        )

        # 4. Persist run to database for live system tracking
        opt_id = result["optimization_id"]
        try:
            opt_run = OptimizationRun(
                optimization_id=opt_id,
                created_at=datetime.utcnow(),
                solver=result["solver"],
                solver_status=result["status"],
                objective_value=result["objective_value"],
                available_units_count=result["available_units"],
                allocated_units_count=result["allocated_units"],
                unallocated_units_count=result["unallocated_units_count"],
                total_demand_locations=result["total_demand_locations"],
                covered_locations_count=result["covered_locations"],
                uncovered_locations_count=result["uncovered_locations_count"],
                risk_weighted_coverage=result["risk_weighted_coverage_pct"],
                resource_utilization=result["resource_utilization_pct"],
                resource_shortage_score=result["resource_shortage_score"],
                solver_time_seconds=result["solver_time_seconds"],
                uncovered_locations_json=result["uncovered_locations"],
                unallocated_units_json=result["unallocated_units"],
                configuration_json=result["configuration"],
            )
            db.add(opt_run)

            for a in result["assignments"]:
                assign_model = AllocationAssignment(
                    optimization_id=opt_id,
                    unit_id=a["unit_id"],
                    location_id=a["location_id"],
                    location_name=a["location_name"],
                    risk_score=a["risk_score"],
                    risk_class=a["risk_class"],
                    traffic_congestion_score=a["traffic_congestion_score"],
                    incident_priority_score=a["incident_priority_score"],
                    coverage_gap_score=a["coverage_gap_score"],
                    eta_minutes=a["eta_minutes"],
                    distance_km=a["distance_km"],
                    assignment_value=a["assignment_value"],
                    status=a["status"],
                    reason=a["reason"],
                    created_at=datetime.utcnow(),
                )
                db.add(assign_model)

            db.commit()
            logger.info(f"✅ SUCCESS! Persisted OptimizationRun [{opt_id}] with {len(result['assignments'])} assignments in DB.")
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to persist OptimizationRun in DB: {e}")

        return result

    @staticmethod
    def get_latest_optimization(db: Session) -> Optional[Dict[str, Any]]:
        """Fetch latest optimization run from DB or return None."""
        run = db.query(OptimizationRun).order_by(OptimizationRun.created_at.desc()).first()
        if not run:
            return None

        assignments = (
            db.query(AllocationAssignment)
            .filter(AllocationAssignment.optimization_id == run.optimization_id)
            .order_by(AllocationAssignment.assignment_value.desc())
            .all()
        )

        return {
            "optimization_id": run.optimization_id,
            "generated_at": run.created_at.isoformat(),
            "solver": run.solver,
            "status": run.solver_status,
            "objective_value": run.objective_value,
            "solver_time_seconds": run.solver_time_seconds,
            "available_units": run.available_units_count,
            "allocated_units": run.allocated_units_count,
            "unallocated_units_count": run.unallocated_units_count,
            "total_demand_locations": run.total_demand_locations,
            "covered_locations": run.covered_locations_count,
            "uncovered_locations_count": run.uncovered_locations_count,
            "risk_weighted_coverage_pct": run.risk_weighted_coverage,
            "resource_utilization_pct": run.resource_utilization,
            "resource_shortage_score": run.resource_shortage_score,
            "assignments": [
                {
                    "optimization_id": a.optimization_id,
                    "unit_id": a.unit_id,
                    "location_id": a.location_id,
                    "location_name": a.location_name,
                    "risk_score": a.risk_score,
                    "risk_class": a.risk_class,
                    "traffic_congestion_score": a.traffic_congestion_score,
                    "incident_priority_score": a.incident_priority_score,
                    "coverage_gap_score": a.coverage_gap_score,
                    "distance_km": a.distance_km,
                    "eta_minutes": a.eta_minutes,
                    "assignment_value": a.assignment_value,
                    "status": a.status,
                    "reason": a.reason,
                }
                for a in assignments
            ],
            "unallocated_units": run.unallocated_units_json or [],
            "uncovered_locations": run.uncovered_locations_json or [],
            "configuration": run.configuration_json or {},
        }

    @staticmethod
    def apply_optimization(db: Session, optimization_id: str) -> Dict[str, Any]:
        """Human approval workflow: Applies recommended allocations by updating PoliceUnit status to DEPLOYED."""
        run = db.query(OptimizationRun).filter(OptimizationRun.optimization_id == optimization_id).first()
        if not run:
            raise ValueError(f"Optimization run '{optimization_id}' not found.")

        assignments = (
            db.query(AllocationAssignment)
            .filter(AllocationAssignment.optimization_id == optimization_id)
            .all()
        )

        applied_count = 0
        for a in assignments:
            if a.status == "RECOMMENDED":
                police_unit_service.update_status(db, a.unit_id, "DEPLOYED")
                a.status = "ACCEPTED"
                applied_count += 1

        db.commit()
        logger.info(f"✅ Human Approval: Applied {applied_count} allocations for Optimization [{optimization_id}].")
        return {
            "optimization_id": optimization_id,
            "applied_count": applied_count,
            "status": "DISPATCHED",
            "applied_at": datetime.utcnow().isoformat(),
        }


resource_allocation_service = ResourceAllocationService()
