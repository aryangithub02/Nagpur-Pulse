"""
Unit tests for historical accident ingestion and schema validation.
"""

import pandas as pd
import pytest
from app.pipeline.accident_ingestion import clean_accident_dataframe
from app.pipeline.validators import validate_accident_record

def test_clean_accident_dataframe_basic():
    raw_data = {
        "AccidentID": [101, 102, 101], # Includes duplicate
        "Date": ["2023-05-10", "2023-05-12", "2023-05-10"],
        "Time": ["14:30", "18:00", "14:30"],
        "Junction": ["Sitabuldi Chowk", "Lokmat Chowk", "Sitabuldi Chowk"],
        "Severity": ["Minor", "Fatal", "Minor"],
        "InjuredCount": [1, 0, 1],
        "FatalityCount": [0, 1, 0],
        "VehiclesInvolved": [2, 1, 2]
    }
    raw_df = pd.DataFrame(raw_data)
    clean_df, report = clean_accident_dataframe(raw_df, data_source="SIMULATED", is_simulated=True)

    assert len(clean_df) == 2
    assert report["duplicate_records"] == 1
    assert "data_source" in clean_df.columns
    assert (clean_df["data_source"] == "SIMULATED").all()
    assert (clean_df["is_simulated"] == True).all()

def test_clean_accident_dataframe_negative_numbers():
    raw_data = {
        "AccidentID": [101],
        "Date": ["2023-05-10"],
        "Junction": ["Sitabuldi Chowk"],
        "Severity": ["Minor"],
        "InjuredCount": [-5], # Negative count
        "FatalityCount": [0],
        "VehiclesInvolved": [1]
    }
    raw_df = pd.DataFrame(raw_data)
    clean_df, report = clean_accident_dataframe(raw_df)

    # Negative counts should be sanitized to 0
    assert clean_df.iloc[0]["injuredcount"] == 0

def test_validate_accident_record_valid():
    record = {
        "accidentid": "ACC123",
        "date": "2023-05-10",
        "junction": "Sitabuldi Chowk",
        "severity": "Minor",
        "injuredcount": 2,
        "fatalitycount": 0,
        "vehiclesinvolved": 2,
        "data_source": "SIMULATED",
        "is_simulated": True
    }
    is_valid, errors = validate_accident_record(record)
    assert is_valid is True
    assert len(errors) == 0

def test_validate_accident_record_invalid():
    record = {
        "accidentid": "ACC123",
        "date": "2023-05-10",
        "junction": "", # Empty junction
        "severity": "Minor",
        "injuredcount": -2, # Negative
        "data_source": "INVALID_SOURCE", # Invalid source
        "is_simulated": "not_a_bool"
    }
    is_valid, errors = validate_accident_record(record)
    assert is_valid is False
    assert len(errors) > 0
