import logging
import os
from typing import Dict, Any, List, Optional
import httpx
from app.services.spatial_utils import (
    haversine_distance_km,
    estimate_travel_time_minutes,
    generate_route_waypoints,
)

logger = logging.getLogger("tomtom_service")


class TomTomService:
    """Server-side service for TomTom Routing API communication, response normalization, and GeoJSON formatting."""

    def __init__(self):
        self.api_key = os.getenv("TOMTOM_API_KEY", "")
        self.base_url = os.getenv("TOMTOM_BASE_URL", "https://api.tomtom.com")
        self.timeout_seconds = 5.0  # 5-second HTTP timeout for live requests

    def _get_fallback_route(
        self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
    ) -> Dict[str, Any]:
        """Spatial fallback route calculation used when TomTom is unconfigured, times out, or fails."""
        dist_km = haversine_distance_km(origin_lat, origin_lon, dest_lat, dest_lon)
        dist_meters = int(dist_km * 1000)
        time_min = estimate_travel_time_minutes(dist_km)
        time_sec = int(time_min * 60)

        waypoints = generate_route_waypoints(origin_lat, origin_lon, dest_lat, dest_lon, steps=5)
        geojson_coords = [[pt["longitude"], pt["latitude"]] for pt in waypoints]

        return {
            "distance_meters": dist_meters,
            "distance_km": dist_km,
            "travel_time_seconds": time_sec,
            "travel_time_minutes": time_min,
            "route_geometry": {
                "type": "LineString",
                "coordinates": geojson_coords
            },
            "is_simulated": True
        }

    def calculate_route(
        self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float
    ) -> Dict[str, Any]:
        """Synchronous wrapper for route calculation using TomTom API or spatial fallback."""
        api_key = os.getenv("TOMTOM_API_KEY", self.api_key).strip()

        if not api_key:
            logger.info("TomTom API key not configured. Using spatial routing fallback.")
            return self._get_fallback_route(origin_lat, origin_lon, dest_lat, dest_lon)

        url = f"{self.base_url}/routing/1/calculateRoute/{origin_lat},{origin_lon}:{dest_lat},{dest_lon}/json"
        params = {
            "key": api_key,
            "travelMode": "car",
            "traffic": "true"
        }

        try:
            with httpx.Client(timeout=self.timeout_seconds) as client:
                response = client.get(url, params=params)
                if response.status_code != 200:
                    logger.error(f"TomTom API HTTP error status: {response.status_code}")
                    return self._get_fallback_route(origin_lat, origin_lon, dest_lat, dest_lon)

                data = response.json()
                routes = data.get("routes", [])
                if not routes:
                    logger.warning("TomTom API returned no routes.")
                    return self._get_fallback_route(origin_lat, origin_lon, dest_lat, dest_lon)

                first_route = routes[0]
                summary = first_route.get("summary", {})
                dist_meters = summary.get("lengthInMeters", 0)
                dist_km = round(dist_meters / 1000.0, 2)
                time_sec = summary.get("travelTimeInSeconds", 0)
                time_min = round(time_sec / 60.0, 1)

                # Extract points from leg 0
                points_list = []
                legs = first_route.get("legs", [])
                if legs:
                    points_list = legs[0].get("points", [])

                # Format GeoJSON LineString coordinates in [longitude, latitude] format
                geojson_coords = []
                for pt in points_list:
                    geojson_coords.append([round(pt["longitude"], 6), round(pt["latitude"], 6)])

                if not geojson_coords:
                    waypoints = generate_route_waypoints(origin_lat, origin_lon, dest_lat, dest_lon)
                    geojson_coords = [[pt["longitude"], pt["latitude"]] for pt in waypoints]

                return {
                    "distance_meters": dist_meters,
                    "distance_km": dist_km,
                    "travel_time_seconds": time_sec,
                    "travel_time_minutes": time_min,
                    "route_geometry": {
                        "type": "LineString",
                        "coordinates": geojson_coords
                    },
                    "is_simulated": False
                }
        except httpx.TimeoutException:
            logger.warning("TomTom API request timed out. Falling back to spatial calculation.")
            return self._get_fallback_route(origin_lat, origin_lon, dest_lat, dest_lon)
        except Exception as e:
            logger.error(f"Unexpected TomTom routing error: {str(e)}")
            return self._get_fallback_route(origin_lat, origin_lon, dest_lat, dest_lon)


tomtom_service = TomTomService()
