"""
Unit tests for junction matching and string normalization.
"""

from app.pipeline.junction_matcher import match_junction, normalize_junction_string, slugify_junction_id

def test_normalize_junction_string():
    assert normalize_junction_string("  Sitabuldi   Chowk  ") == "sitabuldi chowk"
    assert normalize_junction_string("LOKMAT CHOWK") == "lokmat chowk"

def test_slugify_junction_id():
    assert slugify_junction_id("Sitabuldi Chowk") == "sitabuldi-chowk"
    assert slugify_junction_id("  Lokmat   Square  ") == "lokmat-square"

def test_match_junction_exact():
    res = match_junction("Sitabuldi Chowk")
    assert res["match_type"] in ["EXACT", "ALIAS"]
    assert res["canonical_name"] == "Sitabuldi Chowk"
    assert res["location_id"] == "sitabuldi-chowk"
    assert res["confidence"] == 1.0

def test_match_junction_case_and_whitespace():
    res = match_junction("  sitabuldi   chowk  ")
    assert res["match_type"] in ["EXACT", "ALIAS"]
    assert res["canonical_name"] == "Sitabuldi Chowk"

def test_match_junction_unknown():
    res = match_junction("Nonexistent Random Chowk 999")
    assert res["match_type"] == "UNMATCHED"
    assert res["confidence"] == 0.0
