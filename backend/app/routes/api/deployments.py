from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.deployment_service import deployment_service
from app.schemas.api_schemas import DeploymentItem, DeploymentListResponse

router = APIRouter(prefix="/api/deployments", tags=["Frontend - Deployments"])


@router.get("", response_model=DeploymentListResponse, summary="Get active police deployments")
def get_deployments(db: Session = Depends(get_db)) -> DeploymentListResponse:
    """Return active police deployments by delegating to DeploymentService."""
    deployments = deployment_service.get_deployments(db)
    items = []
    for d in deployments:
        unit_name = d.unit.name if d.unit else None
        loc_name = d.junction.name if d.junction else None
        items.append(
            DeploymentItem(
                id=d.id,
                unitId=d.unit_id,
                unitName=unit_name,
                locationId=str(d.location_id),
                locationName=loc_name,
                recommendationId=d.recommendation_id,
                status=d.status,
                deployedAt=d.deployed_at
            )
        )
    return DeploymentListResponse(deployments=items)
