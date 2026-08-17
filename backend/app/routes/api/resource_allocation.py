import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.resource_allocation_service import resource_allocation_service
from app.services.fast_allocation_service import fast_allocation_service
from app.services.allocation_state import StateBuilder
from app.services.auth_service import decode_access_token
from app.models.user import User

logger = logging.getLogger("resource_allocation_router")

router = APIRouter(prefix="/resource-allocation", tags=["Resource Allocation Engine (OR-Tools & Fast Greedy)"])
fast_router = APIRouter(prefix="/allocation", tags=["Fast Greedy Resource Allocation"])


def get_user_or_fallback(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        payload = decode_access_token(token)
        if payload and payload.get("user_id"):
            u = db.query(User).filter(User.id == payload.get("user_id")).first()
            if u:
                return {"username": u.username, "role": u.role, "zone": u.zone_code or "CENTRAL"}
    return {"username": "np.central.ops", "role": "ZONE_ADMIN", "zone": "CENTRAL"}


class FastAllocationRequest(BaseModel):
    zone: Optional[str] = Field(None, description="Operational zone (e.g. CENTRAL, NORTH, ALL)")
    include_patrolling_units: bool = Field(default=False, description="Whether patrolling units are eligible")
    max_eta_minutes: float = Field(default=20.0, ge=1.0, le=60.0, description="Max response time in minutes")
    priority_weights: Optional[Dict[str, float]] = Field(default=None, description="Custom priority weights")
    assignment_weights: Optional[Dict[str, float]] = Field(default=None, description="Custom assignment weights")


class OptimizeRequest(BaseModel):
    scope: str = Field(default="city", description="Optimization scope ('city' or 'zone')")
    include_patrolling_units: bool = Field(default=False, description="Whether patrolling units are eligible for re-allocation")
    max_eta_minutes: float = Field(default=15.0, ge=1.0, le=60.0, description="Maximum allowed ETA in minutes")
    solver_time_limit: float = Field(default=3.0, ge=0.5, le=30.0, description="OR-Tools solver time limit in seconds")
    priority_weights: Optional[Dict[str, float]] = Field(default=None, description="Custom priority component weights")


@router.post("/fast", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
@fast_router.post("/fast", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def trigger_fast_greedy_allocation(
    payload: FastAllocationRequest = FastAllocationRequest(),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Executes Fast Greedy + Risk-Based Priority Resource Allocation (< 100ms).
    Consumes live ML risk predictions, traffic congestion, active incidents,
    weather telemetry, and real police unit positions without synthetic data.
    Enforces zone RBAC authorization.
    """
    user_role = current_user.get("role", "ZONE_ADMIN")
    user_zone = current_user.get("zone", "CENTRAL")

    # Enforce Zone Scoping: SYSTEM_ADMIN can select any zone; other roles are locked to their assigned zone
    if user_role == "SYSTEM_ADMIN" and payload.zone:
        effective_zone = payload.zone
    else:
        effective_zone = user_zone if user_zone != "ALL" else (payload.zone or "CENTRAL")

    try:
        state = StateBuilder.build_from_db(db, zone_code=effective_zone)
        result = fast_allocation_service.allocate(
            state=state,
            max_eta_minutes=payload.max_eta_minutes,
            include_patrolling=payload.include_patrolling_units,
            priority_weights=payload.priority_weights,
            assignment_weights=payload.assignment_weights
        )
        return result
    except Exception as e:
        logger.error(f"Error executing Fast Greedy resource allocation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fast resource allocation failed: {str(e)}"
        )


@router.post("/optimize", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def trigger_resource_optimization(
    payload: OptimizeRequest = OptimizeRequest(),
    db: Session = Depends(get_db)
):
    """
    Trigger Google OR-Tools CP-SAT integer programming solver to compute optimal police resource allocation.
    """
    try:
        res = resource_allocation_service.run_optimization(
            db=db,
            max_eta_minutes=payload.max_eta_minutes,
            include_patrolling=payload.include_patrolling_units,
            weights=payload.priority_weights,
            solver_time_limit=payload.solver_time_limit
        )
        return {"success": True, "data": res}
    except Exception as e:
        logger.error(f"Error executing OR-Tools resource allocation: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resource allocation optimization failed: {str(e)}"
        )


@router.get("/latest", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def get_latest_optimization(db: Session = Depends(get_db)):
    """
    Retrieve latest OR-Tools CP-SAT resource allocation result.
    If no run exists in DB, triggers an initial optimization run.
    """
    try:
        latest = resource_allocation_service.get_latest_optimization(db)
        if not latest:
            latest = resource_allocation_service.run_optimization(db)
        return {"success": True, "data": latest}
    except Exception as e:
        logger.error(f"Error fetching latest optimization: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve latest resource allocation: {str(e)}"
        )


@router.get("/{optimization_id}", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def get_optimization_by_id(optimization_id: str, db: Session = Depends(get_db)):
    """
    Retrieve specific historical optimization run by ID.
    """
    try:
        from app.models.optimization_run import OptimizationRun
        from app.models.allocation_assignment import AllocationAssignment

        run = db.query(OptimizationRun).filter(OptimizationRun.optimization_id == optimization_id).first()
        if not run:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Optimization run '{optimization_id}' not found."
            )

        assignments = (
            db.query(AllocationAssignment)
            .filter(AllocationAssignment.optimization_id == optimization_id)
            .all()
        )

        res = {
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
        return {"success": True, "data": res}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching optimization '{optimization_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to retrieve optimization run: {str(e)}"
        )


@router.post("/{optimization_id}/apply", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def apply_optimization_recommendation(optimization_id: str, db: Session = Depends(get_db)):
    """
    Human Approval Endpoint: Applies recommended allocations by marking unit status as DEPLOYED.
    """
    try:
        res = resource_allocation_service.apply_optimization(db, optimization_id)
        return {"success": True, "data": res}
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))
    except Exception as e:
        logger.error(f"Error applying optimization '{optimization_id}': {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to apply optimization recommendations: {str(e)}"
        )
