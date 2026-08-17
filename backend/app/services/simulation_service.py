import copy
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.simulation_run import SimulationRun
from app.services.snapshot_service import snapshot_service
from app.services.scenario_engine import scenario_engine
from app.services.resource_allocation_service import resource_allocation_service
from app.services.fast_allocation_service import fast_allocation_service
from app.services.simulation_comparison_service import simulation_comparison_service
from app.services.auth_service import create_audit_entry
from app.services.police_unit_service import police_unit_service

logger = logging.getLogger("simulation_service")

SIMULATION_RESULT_CACHE: Dict[str, Dict[str, Any]] = {}


class SimulationService:
    """
    SimulationService manages read-only What-If resource simulation workflows.
    Ensures zero mutation of live database tables, deterministic solver execution, and stale snapshot protection.
    """

    @staticmethod
    def create_simulation(
        db: Session,
        user_info: Dict[str, Any],
        base_snapshot_id: str,
        changes: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Executes a read-only What-If resource allocation simulation.
        """
        username = user_info.get("username", "system")
        user_zone = user_info.get("zone", "ALL")
        user_role = user_info.get("role", "ZONE_ADMIN")

        # 1. Load Base Snapshot
        if base_snapshot_id == "latest" or not base_snapshot_id:
            snapshot = snapshot_service.create_snapshot(db, zone_code=user_zone)
            base_snapshot_id = snapshot["snapshot_id"]
        else:
            snapshot = snapshot_service.get_snapshot(base_snapshot_id)
            if not snapshot:
                # Fallback create fresh if snapshot expired
                snapshot = snapshot_service.create_snapshot(db, zone_code=user_zone)
                base_snapshot_id = snapshot["snapshot_id"]

        # 2. Validate Scenario Changes & RBAC Zone Ownership
        valid, errors = scenario_engine.validate_changes(snapshot, changes, user_zone=user_zone)
        if not valid:
            logger.warning(f"Simulation rejected due to validation errors: {errors}")
            return {
                "simulation_id": f"SIM-{uuid.uuid4().hex[:8].upper()}",
                "status": "INVALID_SCENARIO",
                "base_snapshot_id": base_snapshot_id,
                "errors": errors,
                "live_state_modified": False,
            }

        # 3. Run Live Plan Baseline Optimization (In-Memory via Fast Greedy Engine)
        live_plan = fast_allocation_service.run_allocation_on_state(
            units=snapshot["units"],
            demands=snapshot["demands"],
            opt_id_prefix="live_plan"
        )

        # 4. Apply Scenario Changes to Temporary Memory State
        sim_state = scenario_engine.apply_changes(snapshot, changes)

        # 5. Run Simulated Plan Optimization (In-Memory via Fast Greedy Engine)
        sim_plan = fast_allocation_service.run_allocation_on_state(
            units=sim_state["units"],
            demands=sim_state["demands"],
            unavailable_routes=sim_state.get("unavailable_routes", []),
            unavailable_junctions=sim_state.get("unavailable_junctions", []),
            opt_id_prefix="sim_plan"
        )

        # 6. Compare Baseline Live Plan vs Simulated Plan
        comparison = simulation_comparison_service.compare_plans(
            live_plan=live_plan,
            sim_plan=sim_plan,
            scenario_summary=sim_state.get("changes_applied_summary", [])
        )

        sim_id = f"SIM-{uuid.uuid4().hex[:8].upper()}"
        now_iso = datetime.utcnow().isoformat()

        # Format spec-exact change summary diffs
        formatted_changes = [
            {
                "unit_id": diff.get("unit_id"),
                "from": diff.get("live_location_name") or (f"J-{diff.get('live_location_id'):02d}" if diff.get("live_location_id") else "UNASSIGNED"),
                "to": diff.get("simulated_location_name") or (f"J-{diff.get('simulated_location_id'):02d}" if diff.get("simulated_location_id") else "UNASSIGNED"),
            }
            for diff in comparison.get("changes_in_plan", [])
            if diff.get("change_type") != "UNCHANGED"
        ]

        live_plan_list = [
            {
                "unit_id": a.get("unit_id"),
                "location_id": f"J-{a.get('location_id'):02d}" if isinstance(a.get("location_id"), int) else a.get("location_id"),
                "location_name": a.get("location_name"),
                "eta_minutes": a.get("eta_minutes"),
            }
            for a in live_plan.get("assignments", [])
        ]

        simulated_plan_list = [
            {
                "unit_id": a.get("unit_id"),
                "location_id": f"J-{a.get('location_id'):02d}" if isinstance(a.get("location_id"), int) else a.get("location_id"),
                "location_name": a.get("location_name"),
                "eta_minutes": a.get("eta_minutes"),
            }
            for a in sim_plan.get("assignments", [])
        ]

        # Build Full Simulation Result Payload
        result_payload = {
            "simulation_id": sim_id,
            "algorithm": "GREEDY_PRIORITY",
            "algorithm_version": "1.0",
            "scenario_name": changes[0].get("scenario_name") if (changes and isinstance(changes[0], dict) and changes[0].get("scenario_name")) else "Hypothetical Scenario",
            "summary": comparison["human_readable_summary"],
            "base_snapshot_id": base_snapshot_id,
            "created_by": username,
            "zone_code": user_zone,
            "created_at": now_iso,
            "status": "COMPLETED",
            "scenario": {
                "unit_id": changes[0].get("unit_id") if changes else None,
                "change": f"{changes[0].get('type')} → {changes[0].get('value') or changes[0].get('risk_class') or 'MODIFIED'}" if changes else "MODIFIED",
                "changes": changes,
                "changes_applied_summary": sim_state.get("changes_applied_summary", []),
            },
            "live_plan": live_plan_list,
            "simulated_plan": simulated_plan_list,
            "changes": formatted_changes,
            "live_plan_detail": live_plan,
            "simulated_plan_detail": sim_plan,
            "comparison": comparison,
            "coverage_before": comparison["coverage_before"],
            "coverage_after": comparison["coverage_after"],
            "risk_weighted_coverage_before": comparison["risk_weighted_coverage_before"],
            "risk_weighted_coverage_after": comparison["risk_weighted_coverage_after"],
            "resource_utilization_before": comparison["resource_utilization_before"],
            "resource_utilization_after": comparison["resource_utilization_after"],
            "changes_in_plan": comparison["changes_in_plan"],
            "response_time_changes": comparison["response_time_changes"],
            "uncovered_high_risk": comparison["uncovered_high_risk"],
            "solver": {
                "name": "GREEDY_PRIORITY",
                "status": "COMPLETED",
                "objective_value": sim_plan.get("objective_value", 0.0),
                "solver_time_seconds": round(sim_plan.get("performance", {}).get("total_ms", 5.0) / 1000.0, 4),
            },
            "human_readable_summary": comparison["human_readable_summary"],
            "live_state_modified": False,
        }

        # Cache in memory
        SIMULATION_RESULT_CACHE[sim_id] = copy.deepcopy(result_payload)

        # Persist DB Run Metadata for Audit History
        try:
            sim_run = SimulationRun(
                simulation_id=sim_id,
                base_snapshot_id=base_snapshot_id,
                created_by=username,
                zone_code=user_zone,
                created_at=datetime.utcnow(),
                status=result_payload["status"],
                solver_status=sim_plan.get("status", "COMPLETED"),
                objective_value=sim_plan.get("objective_value", 0.0),
                coverage_before=comparison["coverage_before"],
                coverage_after=comparison["coverage_after"],
                risk_weighted_coverage_before=comparison["risk_weighted_coverage_before"],
                risk_weighted_coverage_after=comparison["risk_weighted_coverage_after"],
                scenario_json={"changes": changes},
                result_json=result_payload,
                live_state_modified=False,
            )
            db.add(sim_run)
            db.commit()

            create_audit_entry(
                db,
                username=username,
                role=user_role,
                zone_code=user_zone,
                action="SIMULATION_CREATED",
                resource_type="SIMULATION",
                resource_id=sim_id,
                details=f"Ran What-If simulation {sim_id} with {len(changes)} scenario changes on snapshot {base_snapshot_id}. Coverage: {comparison['coverage_before']}% -> {comparison['coverage_after']}%.",
                success=True
            )
        except Exception as err:
            db.rollback()
            logger.error(f"Failed to persist SimulationRun in DB: {err}")

        logger.info(f"✅ WHAT-IF SIMULATION COMPLETED [{sim_id}] (Base: {base_snapshot_id}) live_state_modified=False.")
        return result_payload

    @staticmethod
    def get_simulation(db: Session, simulation_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieves a simulation run by simulation_id.
        """
        if simulation_id in SIMULATION_RESULT_CACHE:
            return copy.deepcopy(SIMULATION_RESULT_CACHE[simulation_id])

        run = db.query(SimulationRun).filter(SimulationRun.simulation_id == simulation_id).first()
        if run:
            return run.result_json
        return None

    @staticmethod
    def list_simulations(db: Session, user_zone: str = "ALL", limit: int = 20) -> List[Dict[str, Any]]:
        """
        Lists recent simulation runs filtered by zone authorization.
        """
        query = db.query(SimulationRun).order_by(SimulationRun.created_at.desc())
        if user_zone != "ALL":
            query = query.filter(SimulationRun.zone_code == user_zone)

        runs = query.limit(limit).all()
        return [
            {
                "simulation_id": r.simulation_id,
                "base_snapshot_id": r.base_snapshot_id,
                "created_by": r.created_by,
                "zone_code": r.zone_code,
                "created_at": r.created_at.isoformat(),
                "status": r.status,
                "solver_status": r.solver_status,
                "coverage_before": r.coverage_before,
                "coverage_after": r.coverage_after,
                "scenario_changes_count": len(r.scenario_json.get("changes", [])),
                "live_state_modified": False,
            }
            for r in runs
        ]

    @staticmethod
    def apply_simulation(db: Session, user_info: Dict[str, Any], simulation_id: str) -> Dict[str, Any]:
        """
        Applies a simulated recommendation to the live system after revalidating against current live state.
        Enforces Stale Snapshot Protection.
        """
        username = user_info.get("username", "system")
        user_role = user_info.get("role", "ZONE_ADMIN")
        user_zone = user_info.get("zone", "ALL")

        sim_data = SimulationService.get_simulation(db, simulation_id)
        if not sim_data:
            return {"success": False, "status": "NOT_FOUND", "message": f"Simulation '{simulation_id}' not found."}

        # 1. Stale Snapshot Check
        current_live_snap_id = snapshot_service.get_current_live_snapshot_id(db, zone_code=sim_data.get("zone_code", "ALL"))
        base_snap_id = sim_data.get("base_snapshot_id")

        if base_snap_id != current_live_snap_id:
            create_audit_entry(
                db, username=username, role=user_role, zone_code=user_zone,
                action="SIMULATION_APPLY_REJECTED", resource_type="SIMULATION", resource_id=simulation_id,
                details=f"Apply rejected for stale simulation {simulation_id}. Base snapshot {base_snap_id} != Current live snapshot {current_live_snap_id}.",
                success=False
            )
            return {
                "success": False,
                "status": "STALE",
                "message": f"SIMULATION IS STALE. Base snapshot ({base_snap_id}) does not match current live snapshot ({current_live_snap_id}). Please re-run simulation.",
                "base_snapshot_id": base_snap_id,
                "current_live_snapshot_id": current_live_snap_id,
            }

        # 2. Execute Dispatch for Simulated Assignments
        sim_assignments = sim_data.get("simulated_plan", {}).get("assignments", [])
        applied_count = 0
        for a in sim_assignments:
            u_id = a.get("unit_id")
            if u_id:
                try:
                    police_unit_service.update_status(db, u_id, "DEPLOYED")
                    applied_count += 1
                except Exception as err:
                    logger.warning(f"Could not deploy unit {u_id}: {err}")

        create_audit_entry(
            db, username=username, role=user_role, zone_code=user_zone,
            action="SIMULATION_APPLIED", resource_type="SIMULATION", resource_id=simulation_id,
            details=f"Applied simulation {simulation_id} to live operational state. Deployed {applied_count} police units.",
            success=True
        )

        return {
            "success": True,
            "status": "APPLIED",
            "simulation_id": simulation_id,
            "applied_count": applied_count,
            "applied_at": datetime.utcnow().isoformat(),
        }


simulation_service = SimulationService()
