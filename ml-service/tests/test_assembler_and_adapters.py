"""
Unit tests for feature assembler and mock data adapters.
"""

from app.config import FEATURES
from app.pipeline.feature_assembler import assemble_model_features, assemble_full_pipeline_response
from app.adapters.traffic import TrafficAdapter
from app.adapters.incidents import IncidentsAdapter
from app.adapters.parking import ParkingAdapter
from app.adapters.weather import WeatherAdapter
from app.adapters.events import EventsAdapter

def test_assemble_model_features_ordering():
    hist_features = {
        "accidents_7d": 2.0,
        "accidents_30d": 8.0,
        "accidents_90d": 21.0,
        "accidents_1y": 75.0,
        "fatal_accidents_1y": 3.0,
        "injury_accidents_1y": 28.0,
        "historical_accident_rate": 6.25,
        "junction": "Sitabuldi Chowk"
    }

    assembled = assemble_model_features(hist_features)
    assert list(assembled.keys()) == FEATURES

def test_assemble_full_pipeline_response():
    hist_features = {
        "accidents_7d": 2.0,
        "accidents_30d": 8.0,
        "accidents_90d": 21.0,
        "accidents_1y": 75.0,
        "fatal_accidents_1y": 3.0,
        "injury_accidents_1y": 28.0,
        "historical_accident_rate": 6.25,
        "junction": "Sitabuldi Chowk"
    }

    res = assemble_full_pipeline_response("sitabuldi-chowk", "Sitabuldi Chowk", hist_features)
    assert res["location_id"] == "sitabuldi-chowk"
    assert res["junction"] == "Sitabuldi Chowk"
    assert "features" in res
    assert "data_sources" in res
    assert res["data_sources"]["accidents"] == "SIMULATED"

def test_mock_adapters():
    traffic = TrafficAdapter().fetch("sitabuldi-chowk")
    assert traffic["status"] == "MOCK"

    incidents = IncidentsAdapter().fetch("sitabuldi-chowk")
    assert incidents["status"] == "MOCK"

    parking = ParkingAdapter().fetch("sitabuldi-chowk")
    assert parking["status"] == "MOCK"

    weather = WeatherAdapter().fetch("sitabuldi-chowk")
    assert weather["status"] == "MOCK"

    events = EventsAdapter().fetch("sitabuldi-chowk")
    assert events["status"] == "MOCK"
