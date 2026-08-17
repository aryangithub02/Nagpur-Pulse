from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.deployment_service import deployment_service
from app.services.police_unit_service import police_unit_service
from app.schemas.api_schemas import (
    RecommendationItem,
    RecommendationListResponse,
    RecommendationUpdateRequest,
    AcceptRecommendationResponse,
    RejectRecommendationResponse,
    DeploymentItem,
)

router = APIRouter(prefix="/api/recommendations", tags=["Frontend - Recommendations"])


@router.get("", response_model=RecommendationListResponse, summary="Get deployment recommendations")
def get_recommendations(db: Session = Depends(get_db)) -> RecommendationListResponse:
    """Return deployment recommendations by delegating to DeploymentService."""
    recs = deployment_service.get_recommendations(db)
    items = []
    for r in recs:
        loc_name = r.junction.name if r.junction else None
        unit_name = r.unit.name if r.unit else None
        items.append(
            RecommendationItem(
                id=r.id,
                locationId=str(r.location_id),
                locationName=loc_name,
                recommendedUnitId=r.unit_id,
                unitName=unit_name,
                reason=r.reason,
                priority=r.priority,
                estimatedDistance=r.estimated_distance,
                estimatedTime=r.estimated_time,
                status=r.status,
                timestamp=r.created_at
            )
        )
    return RecommendationListResponse(recommendations=items)


@router.post("/{rec_id}/accept", response_model=AcceptRecommendationResponse, summary="Accept deployment recommendation")
def accept_recommendation(rec_id: str, db: Session = Depends(get_db)) -> AcceptRecommendationResponse:
    """Accept recommendation by delegating to DeploymentService transactional workflow."""
    rec, dep = deployment_service.accept_recommendation(db, rec_id)

    rec_item = RecommendationItem(
        id=rec.id,
        locationId=str(rec.location_id),
        locationName=rec.junction.name if rec.junction else None,
        recommendedUnitId=rec.unit_id,
        unitName=rec.unit.name if rec.unit else None,
        reason=rec.reason,
        priority=rec.priority,
        estimatedDistance=rec.estimated_distance,
        estimatedTime=rec.estimated_time,
        status=rec.status,
        timestamp=rec.created_at
    )

    dep_item = DeploymentItem(
        id=dep.id,
        unitId=dep.unit_id,
        unitName=dep.unit.name if dep.unit else None,
        locationId=str(dep.location_id),
        locationName=dep.junction.name if dep.junction else None,
        recommendationId=dep.recommendation_id,
        status=dep.status,
        deployedAt=dep.deployed_at
    )

    return AcceptRecommendationResponse(
        success=True,
        deployment=dep_item,
        recommendation=rec_item
    )


@router.post("/{rec_id}/reject", response_model=RejectRecommendationResponse, summary="Reject deployment recommendation")
def reject_recommendation(rec_id: str, db: Session = Depends(get_db)) -> RejectRecommendationResponse:
    """Reject recommendation by delegating to DeploymentService."""
    rec = deployment_service.reject_recommendation(db, rec_id)

    rec_item = RecommendationItem(
        id=rec.id,
        locationId=str(rec.location_id),
        locationName=rec.junction.name if rec.junction else None,
        recommendedUnitId=rec.unit_id,
        unitName=rec.unit.name if rec.unit else None,
        reason=rec.reason,
        priority=rec.priority,
        estimatedDistance=rec.estimated_distance,
        estimatedTime=rec.estimated_time,
        status=rec.status,
        timestamp=rec.created_at
    )

    return RejectRecommendationResponse(
        success=True,
        recommendation=rec_item
    )


@router.patch("/{rec_id}", response_model=RecommendationItem, summary="Update recommendation fields")
def update_recommendation(
    rec_id: str, payload: RecommendationUpdateRequest, db: Session = Depends(get_db)
) -> RecommendationItem:
    """Update recommendation fields by delegating to DeploymentService & PoliceUnitService."""
    recs = deployment_service.get_recommendations(db)
    rec = next((r for r in recs if r.id == rec_id), None)
    if not rec:
        from app.exceptions import RecommendationNotFoundException
        raise RecommendationNotFoundException(f"Recommendation '{rec_id}' not found.")

    if payload.priority:
        rec.priority = payload.priority
    if payload.reason:
        rec.reason = payload.reason
    if payload.recommendedUnitId:
        police_unit_service.get_unit(db, payload.recommendedUnitId)
        rec.unit_id = payload.recommendedUnitId

    rec.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(rec)

    return RecommendationItem(
        id=rec.id,
        locationId=str(rec.location_id),
        locationName=rec.junction.name if rec.junction else None,
        recommendedUnitId=rec.unit_id,
        unitName=rec.unit.name if rec.unit else None,
        reason=rec.reason,
        priority=rec.priority,
        estimatedDistance=rec.estimated_distance,
        estimatedTime=rec.estimated_time,
        status=rec.status,
        timestamp=rec.created_at
    )
