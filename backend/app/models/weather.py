"""
SQLAlchemy ORM Model for Weather Observations in Nagpur Pulse.
"""

from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, Index
from app.database import Base


class WeatherObservation(Base):
    """
    Persisted weather telemetry observation table.
    """
    __tablename__ = "weather_observations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    latitude = Column(Float, nullable=False, default=21.1458)
    longitude = Column(Float, nullable=False, default=79.0882)
    
    # Atmospheric & Telemetry Measurements
    temperature_c = Column(Float, nullable=True)
    feels_like_c = Column(Float, nullable=True)
    humidity_pct = Column(Float, nullable=True)
    pressure_hpa = Column(Float, nullable=True)
    wind_speed_kmh = Column(Float, nullable=True)
    wind_direction_deg = Column(Float, nullable=True)
    precipitation_mm = Column(Float, nullable=True, default=0.0)
    precipitation_probability_pct = Column(Float, nullable=True, default=0.0)
    visibility_km = Column(Float, nullable=True, default=10.0)
    cloud_cover_pct = Column(Float, nullable=True, default=0.0)
    
    # Weather Classification Signals
    weather_code = Column(Integer, nullable=True)
    weather_condition = Column(String(100), nullable=True, default="Clear")
    rain_intensity = Column(String(50), nullable=True, default="NONE")
    lightning_probability = Column(Float, nullable=True, default=0.0)
    storm_flag = Column(Boolean, nullable=True, default=False)
    severe_weather_flag = Column(Boolean, nullable=True, default=False)
    weather_impact_score = Column(Float, nullable=True, default=0.0)
    
    source = Column(String(50), nullable=True, default="OpenWeatherMap")
    created_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    __table_args__ = (
        Index("idx_weather_obs_time_location", "timestamp", "latitude", "longitude"),
    )
