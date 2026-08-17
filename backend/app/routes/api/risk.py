from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.risk_service import risk_service

router = APIRouter(tags=["Frontend & ML - Risk Intelligence"])


# Legacy & v1 Endpoint aliases
@router.get("/api/risk", summary="Get traffic risk across monitored junctions")
@router.get("/api/v1/risk/junctions", summary="Get traffic risk across monitored junctions (v1)")
def get_all_risk(db: Session = Depends(get_db)):
    """
    Returns risk data across all monitored junctions.
    Supports both legacy { riskData: [...] } and direct array structure.
    """
    data = risk_service.get_risk(db)
    return {"riskData": data, "junctions": data}


@router.get("/api/v1/risk/summary", summary="Get city-wide risk summary statistics")
def get_risk_summary(db: Session = Depends(get_db)):
    """
    Returns aggregate summary statistics (total junctions, count by risk level, average risk score).
    """
    return risk_service.get_risk_summary(db)


@router.get("/api/v1/risk/high-risk", summary="Get high-risk junctions")
def get_high_risk_junctions(db: Session = Depends(get_db)):
    """
    Returns junctions categorized as HIGH or CRITICAL risk.
    """
    return {"junctions": risk_service.get_high_risk_junctions(db)}


@router.get("/api/v1/risk/critical", summary="Get critical-risk junctions")
def get_critical_risk_junctions(db: Session = Depends(get_db)):
    """
    Returns junctions categorized as CRITICAL risk.
    """
    return {"junctions": risk_service.get_critical_risk_junctions(db)}


@router.get("/api/risk/{location_id}", summary="Get risk for specific location")
@router.get("/api/v1/risk/junctions/{location_id}", summary="Get risk for specific junction (v1)")
def get_location_risk(location_id: str, db: Session = Depends(get_db)):
    """
    Returns traffic risk assessment for a specific junction.
    """
    risk_item = risk_service.get_location_risk(db, location_id)
    return {"risk": risk_item, "junction": risk_item}


@router.get("/api/v1/risk/history/{location_id}", summary="Get historical risk timeline for junction")
def get_risk_history(location_id: str, limit: int = Query(default=20, ge=1, le=100), db: Session = Depends(get_db)):
    """
    Returns time-series risk history for visualization in detail drawer / charts.
    """
    return risk_service.get_risk_history(db, location_id, limit=limit)
