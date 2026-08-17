"""
Backend Unit Tests for Weather Impact Heatmap & Weather Intelligence Services.
"""

import pytest
from app.database import SessionLocal
from app.services.weather_service import weather_service
from app.services.weather_impact_service import weather_impact_service


def test_weather_config_loads():
    """Verify that WeatherService initializes with configuration."""
    assert weather_service is not None
    assert weather_service.cache_ttl_seconds > 0


def test_weather_impact_score_calculation():
    """Verify WeatherImpactService threshold scores and 5-tier classification."""
    # Light Rain, clear visibility
    res1 = weather_impact_service.calculate_impact(
        precipitation_mm=1.5,
        visibility_km=10.0,
        wind_speed_kmh=10.0,
        storm_flag=False,
    )
    assert 0.0 <= res1["score"] <= 100.0
    assert res1["level"] in ["LOW", "MODERATE", "ELEVATED", "HIGH", "SEVERE"]

    # Heavy Rain, reduced visibility, storm
    res2 = weather_impact_service.calculate_impact(
        precipitation_mm=25.0,
        visibility_km=1.5,
        wind_speed_kmh=45.0,
        storm_flag=True,
    )
    assert res2["score"] > res1["score"]
    assert res2["level"] in ["HIGH", "SEVERE"]


def test_combined_weather_traffic_score_calculation():
    """Verify formula: 0.60 * weather_impact + 0.40 * traffic_congestion."""
    w_score = 80.0
    t_score = 90.0
    combined = weather_impact_service.calculate_combined_score(
        weather_impact_score=w_score,
        traffic_congestion_score=t_score,
        w_weather=0.60,
        w_traffic=0.40
    )
    expected = round(0.60 * 80.0 + 0.40 * 90.0, 1)  # 48 + 36 = 84.0
    assert combined == expected
    assert 0.0 <= combined <= 100.0


def test_current_weather_normalized_response():
    """Verify normalized current weather observation format and secret masking."""
    db = SessionLocal()
    try:
        curr = weather_service.get_current_weather(db=db)
        assert curr is not None
        assert "weather" in curr
        assert "traffic_impact" in curr
        assert "temperature_c" in curr["weather"]
        assert "precipitation_mm" in curr["weather"]
        assert "visibility_km" in curr["weather"]
        assert "wind_speed_kmh" in curr["weather"]

        # Ensure API key is never exposed in response body
        raw_str = str(curr)
        assert "appid" not in raw_str
        assert "bd5e378503939ddaee76f12ad7a97608" not in raw_str
    finally:
        db.close()


def test_weather_heatmap_endpoint_data_structure():
    """Verify spatial heatmap response structure across Nagpur chowks."""
    from app.routes.api.weather import get_weather_heatmap
    db = SessionLocal()
    try:
        res = get_weather_heatmap(hours_ahead=0, db=db)
        assert res is not None
        assert res["city"] == "Nagpur"
        assert "timestamp" in res
        assert "observed_at" in res
        assert "heatmap_points" in res
        assert len(res["heatmap_points"]) == 44

        first_pt = res["heatmap_points"][0]
        assert "junction_id" in first_pt
        assert "name" in first_pt
        assert "weather_impact_score" in first_pt
        assert "traffic_congestion_score" in first_pt
        assert "combined_score" in first_pt
        assert "impact_level" in first_pt
        assert "weather_condition" in first_pt
    finally:
        db.close()


def test_weather_forecast_mode():
    """Verify +1h to +6h weather forecast timelines."""
    from app.routes.api.weather import get_weather_heatmap
    db = SessionLocal()
    try:
        res = get_weather_heatmap(hours_ahead=3, db=db)
        assert res is not None
        assert res["is_forecast"] is True
        assert res["hours_ahead"] == 3
    finally:
        db.close()


def test_degraded_fallback_weather():
    """Verify fallback state handling when weather data is unconfigured or degraded."""
    fallback = weather_service._get_fallback_observation(status_msg="DEGRADED")
    assert fallback["status"] == "DEGRADED"
    assert "weather" in fallback
    assert fallback["weather"]["temperature_c"] == 28.0
    assert fallback["traffic_impact"]["score"] == 0.0
