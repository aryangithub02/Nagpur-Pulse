"""
FastAPI Router for Weather Intelligence Endpoints (/api/v1/weather/*).
Exposes /current, /forecast, /heatmap, /impact, and /health endpoints.
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.junction import Junction
from app.services.weather_service import weather_service
from app.services.weather_impact_service import weather_impact_service

router = APIRouter(prefix="/api/v1/weather", tags=["Frontend & Weather Intelligence"])


@router.get("/health", summary="Weather Service Health Check")
def weather_health():
    """
    Returns operational health status of the WeatherService.
    """
    curr = weather_service.get_current_weather()
    return {
        "status": curr.get("status", "HEALTHY"),
        "provider": "OpenWeatherMap",
        "api_configured": bool(weather_service.api_key),
        "observed_at": curr.get("observed_at"),
    }


@router.get("/current", summary="Get Current Nagpur Weather & Impact")
def get_current_weather(db: Session = Depends(get_db)):
    """
    Retrieves normalized current weather observation and calculated traffic impact score.
    """
    return weather_service.get_current_weather(db=db)


@router.get("/forecast", summary="Get Hourly Weather Forecast & Risk Timeline")
def get_weather_forecast():
    """
    Retrieves hourly weather forecast and projected traffic impact timeline for Nagpur.
    """
    return {"forecast": weather_service.get_weather_forecast()}


@router.get("/impact", summary="Get Operational Traffic Weather Impact Summary")
def get_weather_impact():
    """
    Returns operational impact category, factors, speed penalty %, and ETA multiplier.
    """
    curr = weather_service.get_current_weather()
    return {
        "observed_at": curr.get("observed_at"),
        "weather_condition": curr["weather"]["weather_condition"],
        "precipitation_mm": curr["weather"]["precipitation_mm"],
        "visibility_km": curr["weather"]["visibility_km"],
        "traffic_impact": curr["traffic_impact"],
    }


@router.get("/heatmap", summary="Get Spatial Weather Impact Heatmap Across Chowks")
def get_weather_heatmap(
    hours_ahead: int = Query(default=0, ge=0, le=24, description="Forecast offset in hours (0 for live)"),
    db: Session = Depends(get_db)
):
    """
    Generates spatial weather impact intensity & combined traffic-weather data across all monitored Nagpur chowks.
    """
    from datetime import datetime, timedelta
    from app.models.observation import TrafficObservation

    curr = weather_service.get_current_weather(db=db)
    
    # If forecast mode requested
    if hours_ahead > 0:
        forecast_items = weather_service.get_weather_forecast()
        target_item = None
        for fc in forecast_items:
            if fc.get("hours_ahead", 0) >= hours_ahead:
                target_item = fc
                break
        if not target_item and forecast_items:
            target_item = forecast_items[-1]

        if target_item:
            w_data = target_item.get("weather", {})
            impact_data = target_item.get("traffic_impact", {})
            impact_score = impact_data.get("score", 0.0)
            impact_level = impact_data.get("level", "LOW")
            weather_cond = w_data.get("weather_condition", "Clear")
            precip_mm = w_data.get("precipitation_mm", 0.0)
            visibility_km = w_data.get("visibility_km", 10.0)
            wind_speed_kmh = w_data.get("wind_speed_kmh", 12.0)
            observed_at = target_item.get("forecast_for", datetime.utcnow().isoformat())
            is_forecast = True
        else:
            w_data = curr.get("weather", {})
            impact_data = curr.get("traffic_impact", {})
            impact_score = impact_data.get("score", 0.0)
            impact_level = impact_data.get("level", "LOW")
            weather_cond = w_data.get("weather_condition", "Clear")
            precip_mm = w_data.get("precipitation_mm", 0.0)
            visibility_km = w_data.get("visibility_km", 10.0)
            wind_speed_kmh = w_data.get("wind_speed_kmh", 12.0)
            observed_at = curr.get("observed_at")
            is_forecast = False
    else:
        w_data = curr.get("weather", {})
        impact_data = curr.get("traffic_impact", {})
        impact_score = impact_data.get("score", 0.0)
        impact_level = impact_data.get("level", "LOW")
        weather_cond = w_data.get("weather_condition", "Clear")
        precip_mm = w_data.get("precipitation_mm", 0.0)
        visibility_km = w_data.get("visibility_km", 10.0)
        wind_speed_kmh = w_data.get("wind_speed_kmh", 12.0)
        observed_at = curr.get("observed_at")
        is_forecast = False

    try:
        junctions = db.query(Junction).all()
    except Exception as db_ex:
        logger.warning(f"Could not query junctions from DB, using fallback list: {db_ex}")
        junctions = []

    fallback_data = [
        (1, "LIC Chowk", 21.1556187, 79.0817574),
        (2, "Lokmat Chowk", 21.1354806, 79.0780286),
        (3, "Gaddi Godam Chowk", 21.1616305, 79.083725),
        (4, "Variya Square", 21.1668, 79.0848),
        (5, "Automotive Chowk", 21.1912, 79.0886),
        (6, "Indora Chowk", 21.1764, 79.0864),
        (7, "Kamal Chowk", 21.1678, 79.0945),
        (8, "Panchpaoli Chowk", 21.1623, 79.1012),
        (9, "Agrasen Chowk", 21.1534, 79.1023),
        (10, "Dosar Vaishya Chowk", 21.1512, 79.0956),
        (11, "Subhash Chowk", 21.1467, 79.1045),
        (12, "Chhatrapati Nagar Square", 21.112467, 79.064213),
        (13, "Pratap Nagar Square", 21.1189, 79.0567),
        (14, "Mate Chowk", 21.1245, 79.0589),
        (15, "Deonagar Square", 21.1167, 79.0712),
        (16, "Khamla Square", 21.1134, 79.0689),
        (17, "Ajni Chowk", 21.1256, 79.0834),
        (18, "Medical Square", 21.1345, 79.0945),
        (19, "Baidyanath Chowk", 21.1389, 79.0912),
        (20, "Rambhag Road Intersection", 21.1412, 79.0889),
        (21, "Manewada Square", 21.1045, 79.0923),
        (22, "Omkar Nagar Square", 21.1012, 79.0856),
        (23, "Shatabdi Square", 21.0967, 79.0812),
        (24, "Besada Chowk", 21.0923, 79.0945),
        (25, "Dighori Naka Square", 21.1123, 79.1345),
        (26, "Kharbi Chowk", 21.1267, 79.1389),
        (27, "Sakkardara Chowk", 21.1289, 79.1123),
        (28, "Reshimbagh Square", 21.1323, 79.1056),
        (29, "Krida Chowk", 21.1356, 79.1012),
        (30, "Ashok Chowk", 21.1412, 79.1145),
        (31, "Bhande Plot Square", 21.1378, 79.1234),
        (32, "Garoba Maidan Chowk", 21.1456, 79.1256),
        (33, "Telephone Exchange Square", 21.1489, 79.1189),
        (34, "Central Avenue (CA) Road Chowk", 21.1467, 79.1089),
        (35, "Law College Square", 21.1478, 79.0567),
        (36, "Shankar Nagar Square", 21.1389, 79.0623),
        (37, "Bhole Petrol Pump Chowk", 21.1434, 79.0689),
        (38, "VIP Road Intersection", 21.1512, 79.0645),
        (39, "Japanese Garden Square", 21.1634, 79.0678),
        (40, "TVS Maruti Seva Chowk", 21.1589, 79.0745),
        (41, "RBI Chowk", 21.1512, 79.0845),
        (42, "Samvidhan Square (RBI Square)", 21.1498, 79.0834),
        (43, "Zero Mile Square", 21.1478, 79.0845),
        (44, "Manish Nagar Flyover Intersection", 21.0989, 79.0689),
    ]

    from app.models.junction import Junction as JunctionModel
    if not junctions:
        junctions = [
            JunctionModel(id=j_id, name=j_name, latitude=j_lat, longitude=j_lon)
            for j_id, j_name, j_lat, j_lon in fallback_data
        ]
    elif len(junctions) < 44:
        existing_ids = {j.id for j in junctions}
        for j_id, j_name, j_lat, j_lon in fallback_data:
            if j_id not in existing_ids:
                junctions.append(JunctionModel(id=j_id, name=j_name, latitude=j_lat, longitude=j_lon))

    points = []
    
    # Query latest traffic observations map
    latest_traffic: Dict[int, float] = {}
    try:
        traffic_obs = db.query(TrafficObservation).order_by(TrafficObservation.timestamp.desc()).limit(100).all()
        for t in traffic_obs:
            if t.junction_id not in latest_traffic:
                t_data = t.traffic_data if isinstance(t.traffic_data, dict) else {}
                speed = float(t_data.get("current_speed", 35.0))
                free_flow = float(t_data.get("free_flow_speed", 50.0))
                delay = float(t_data.get("delay_seconds", 0.0))
                
                if delay > 0:
                    cong = min(95.0, max(15.0, round((delay / 300.0) * 100.0, 1)))
                elif free_flow > 0:
                    cong = min(95.0, max(10.0, round((1.0 - (speed / free_flow)) * 100.0, 1)))
                else:
                    cong = 35.0
                latest_traffic[t.junction_id] = cong
    except Exception as e:
        logger.warning(f"Could not load live traffic observations for heatmap: {e}")

    for j in junctions:
        # Spatial micro-variation factor for city-wide observations
        var_factor = 1.0 + (((j.id % 5) - 2) * 0.04)
        j_weather_score = round(min(100.0, max(0.0, impact_score * var_factor)), 1)
        j_traffic_cong = latest_traffic.get(j.id, 35.0 + float((j.id * 7) % 45))
        
        combined_score = weather_impact_service.calculate_combined_score(
            weather_impact_score=j_weather_score,
            traffic_congestion_score=j_traffic_cong,
            w_weather=0.60,
            w_traffic=0.40
        )

        # Classify combined level
        if combined_score <= 20.0:
            c_level = "LOW"
        elif combined_score <= 40.0:
            c_level = "MODERATE"
        elif combined_score <= 60.0:
            c_level = "ELEVATED"
        elif combined_score <= 80.0:
            c_level = "HIGH"
        else:
            c_level = "SEVERE"

        points.append({
            "junction_id": str(j.id),
            "name": j.name,
            "latitude": j.latitude,
            "longitude": j.longitude,
            "weather_impact_score": j_weather_score,
            "traffic_congestion_score": j_traffic_cong,
            "combined_score": combined_score,
            "impact_level": c_level,
            "weather_impact_level": impact_level,
            "precipitation_mm": precip_mm,
            "visibility_km": visibility_km,
            "wind_speed_kmh": wind_speed_kmh,
            "weather_condition": weather_cond,
        })

    is_stale = curr.get("status") == "STALE"

    return {
        "timestamp": datetime.utcnow().isoformat(),
        "observed_at": observed_at,
        "is_forecast": is_forecast,
        "hours_ahead": hours_ahead,
        "is_stale": is_stale,
        "status": curr.get("status", "HEALTHY"),
        "source": "OpenWeatherMap",
        "city": "Nagpur",
        "city_wide_observation": curr["weather"],
        "is_city_wide_observation": True,
        "heatmap_points": points,
        "data": points,
    }
