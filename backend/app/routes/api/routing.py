from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.routing_service import routing_service
from app.schemas.api_schemas import RoutingResponse, RoutingPoint, GeoJSONGeometry

router = APIRouter(prefix="/api/routing", tags=["Frontend - Routing"])


@router.get(
    "/unit/{unit_id}/to/{junction_id}",
    response_model=RoutingResponse,
    summary="Route police unit to junction"
)
def calculate_route(
    unit_id: str, junction_id: str, db: Session = Depends(get_db)
) -> RoutingResponse:
    """Delegate route calculation to RoutingService."""
    route_res = routing_service.calculate_route(db, unit_id, junction_id)

    geojson_geom = GeoJSONGeometry(
        type=route_res["route_geometry"]["type"],
        coordinates=route_res["route_geometry"]["coordinates"]
    )

    compat_points = [
        RoutingPoint(latitude=coord[1], longitude=coord[0])
        for coord in route_res["route_geometry"]["coordinates"]
    ]

    return RoutingResponse(
        unitId=route_res["unitId"],
        junctionId=route_res["junctionId"],
        distanceMeters=route_res["distance_meters"],
        distanceKm=route_res["distance_km"],
        estimatedTimeSeconds=route_res["travel_time_seconds"],
        estimatedTimeMinutes=route_res["travel_time_minutes"],
        routeGeometry=geojson_geom,
        route=compat_points,
        isSimulated=route_res["is_simulated"]
    )
