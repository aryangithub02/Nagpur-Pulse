"""
Nagpur Pulse - What-If Resource Simulation API Endpoints.
Provides read-only scenario simulation, optimization comparison, and stale-snapshot protected apply workflows.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.simulation_service import simulation_service
from app.services.snapshot_service import snapshot_service
from app.services.auth_service import decode_access_token
from app.models.user import User

router = APIRouter(prefix="/simulations", tags=["What-If Resource Simulation"])


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


class ScenarioChangeSchema(BaseModel):
    type: str = Field(..., description="Scenario type: UNIT_STATUS, UNIT_REMOVED, NEW_INCIDENT, INCIDENT_SEVERITY_CHANGE, ROUTE_UNAVAILABLE, JUNCTION_UNAVAILABLE, TRAFFIC_CHANGE, RISK_CHANGE, UNIT_LOCATION_CHANGE")
    unit_id: Optional[str] = Field(None, description="Target police unit ID")
    junction_id: Optional[int] = Field(None, description="Target junction ID")
    incident_id: Optional[str] = Field(None, description="Target incident ID")
    route_id: Optional[str] = Field(None, description="Target route ID")
    value: Optional[Any] = Field(None, description="Target change value (e.g. OFFLINE, CRITICAL)")
    congestion: Optional[float] = Field(None, description="Congestion score 0-100")
    risk_score: Optional[float] = Field(None, description="Risk score 0-100")
    risk_class: Optional[str] = Field(None, description="Risk class label")
    latitude: Optional[float] = Field(None, description="Latitude coordinate")
    longitude: Optional[float] = Field(None, description="Longitude coordinate")
    incident: Optional[Dict[str, Any]] = Field(None, description="New incident object specification")


class SimulationRequestSchema(BaseModel):
    base_snapshot_id: Optional[str] = Field("latest", description="Base operational snapshot ID or 'latest'")
    changes: List[ScenarioChangeSchema] = Field(..., description="List of scenario changes to simulate")


@router.post("/deployment", response_model=Dict[str, Any], status_code=status.HTTP_200_OK)
def create_deployment_simulation(
    payload: SimulationRequestSchema,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Executes a read-only What-If resource allocation simulation.
    Applies scenario changes in-memory, runs OR-Tools CP-SAT optimizer, and compares results against Live Plan.
    Guarantees live_state_modified = False.
    """
    changes_dicts = [c.dict(exclude_none=True) for c in payload.changes]
    result = simulation_service.create_simulation(
        db=db,
        user_info=current_user,
        base_snapshot_id=payload.base_snapshot_id or "latest",
        changes=changes_dicts
    )

    if result.get("status") == "INVALID_SCENARIO":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "Invalid scenario changes.", "errors": result.get("errors", [])}
        )

    return result


@router.get("/deployment/{simulation_id}", response_model=Dict[str, Any])
def get_deployment_simulation(
    simulation_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Retrieves stored simulation result by simulation_id.
    """
    sim_data = simulation_service.get_simulation(db, simulation_id)
    if not sim_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation '{simulation_id}' not found."
        )
    return sim_data


@router.get("/deployment", response_model=List[Dict[str, Any]])
def list_deployment_simulations(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Lists recent simulation runs filtered by zone authorization.
    """
    user_zone = current_user.get("zone", "ALL")
    return simulation_service.list_simulations(db, user_zone=user_zone, limit=limit)


@router.post("/deployment/{simulation_id}/apply", response_model=Dict[str, Any])
def apply_deployment_simulation(
    simulation_id: str,
    db: Session = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_user_or_fallback),
):
    """
    Applies simulated recommendation to live system.
    Enforces Stale Snapshot Protection: rejects application if live snapshot has changed since simulation creation.
    """
    res = simulation_service.apply_simulation(db, current_user, simulation_id)
    if not res.get("success"):
        status_code = status.HTTP_409_CONFLICT if res.get("status") == "STALE" else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=res)
    return res
