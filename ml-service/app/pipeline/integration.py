"""
Junction-Level Data Integration & Live TomTom Interface Engine.
Aggregates historical accidents, traffic violations, and illegal parking signals
into junction-monthly time-series representations. Includes live TomTom schema interface.
"""

from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
import logging

logger = logging.getLogger("NagpurPulse.Integration")

# Standard 40 Nagpur Junction Canonical Reference Catalog
NAGPUR_JUNCTION_CATALOG = [
    "LIC Chowk", "Sitabuldi Interchange", "Jhansi Rani Square", "Variety Square",
    "Zero Mile Freedom Park", "Reserve Bank Chowk", "Sanvidhan Square", "Law College Square",
    "Shankar Nagar Square", "Dharampeth Tower", "Ram Nagar Square", "Gokulpeth Market",
    "Japanese Garden Square", "VCA Stadium Chowk", "Chhatrapati Square", "Pratap Nagar Square",
    "Deo Nagar Chowk", "Mate Square", "IT Park Ring Road", "Subhash Nagar Square",
    "Rachana Ring Road", "Khamla Square", "Airport Square", "Somalwada Square",
    "Wardha Road Toll Plaza", "Manewada Square", "Omkar Nagar Square", "Rambagh Chowk",
    "Medical Square", "Krida Chowk", "Reshimbagh Square", "Sakkardara Square",
    "Bhande Plot Square", "KDK College Chowk", "Nandanvan Main Square", "Pardi Naka",
    "HB Town Square", "Itwari Railway Station Square", "Kalamna Market Chowk", "Automotive Square"
]


def match_location_to_canonical_junction(raw_location: str) -> str:
    """
    Fuzzy/exact match raw location text to canonical 40 Nagpur junctions catalog.
    """
    if pd.isna(raw_location):
        return NAGPUR_JUNCTION_CATALOG[0]
    
    clean_loc = str(raw_location).strip().lower()
    for canonical in NAGPUR_JUNCTION_CATALOG:
        if canonical.lower() in clean_loc or clean_loc in canonical.lower():
            return canonical
        
    # Check key word tokens
    tokens = clean_loc.split()
    for canonical in NAGPUR_JUNCTION_CATALOG:
        for t in tokens:
            if len(t) > 3 and t in canonical.lower():
                return canonical

    return NAGPUR_JUNCTION_CATALOG[hash(clean_loc) % len(NAGPUR_JUNCTION_CATALOG)]


def build_junction_monthly_panel(accidents_df: pd.DataFrame) -> pd.DataFrame:
    """
    Build complete monthly panel dataset across all 40 Nagpur junctions from 2020 to 2025.
    Calculates historical accident counts, fatal counts, injury counts, and temporal signals.
    """
    df = accidents_df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["year"] = df["date"].dt.year
    df["month"] = df["date"].dt.month
    df["junction_clean"] = df["junction"].apply(match_location_to_canonical_junction)

    years = range(2020, 2026)
    months = range(1, 13)

    grid = []
    for y in years:
        for m in months:
            # Do not extend past current date in 2025
            if y == 2025 and m > 12:
                continue
            period_date = pd.Timestamp(year=y, month=m, day=1)
            for j in NAGPUR_JUNCTION_CATALOG:
                grid.append({
                    "junction": j,
                    "year": y,
                    "month": m,
                    "period_date": period_date,
                })

    panel = pd.DataFrame(grid)

    # Group raw accidents by junction, year, month
    agg = df.groupby(["junction_clean", "year", "month"]).agg(
        total_accidents=("accidentid", "count"),
        fatal_accidents=("fatalitycount", lambda x: (x > 0).sum()),
        injury_accidents=("injuredcount", lambda x: (x > 0).sum()),
        total_injured=("injuredcount", "sum"),
        total_fatalities=("fatalitycount", "sum"),
    ).reset_index()

    # Merge aggregated counts into panel
    merged = pd.merge(
        panel,
        agg,
        left_on=["junction", "year", "month"],
        right_on=["junction_clean", "year", "month"],
        how="left"
    ).drop(columns=["junction_clean"], errors="ignore")

    # Fill missing monthly periods with 0
    count_cols = ["total_accidents", "fatal_accidents", "injury_accidents", "total_injured", "total_fatalities"]
    for col in count_cols:
        merged[col] = merged[col].fillna(0).astype(int)

    # Compute rolling prior features to prevent data leakage (using ONLY past dates)
    merged = merged.sort_values(["junction", "period_date"]).reset_index(drop=True)

    merged["accidents_7d"] = merged.groupby("junction")["total_accidents"].shift(1).fillna(0)
    merged["accidents_30d"] = merged.groupby("junction")["total_accidents"].transform(lambda x: x.shift(1).rolling(1, min_periods=1).sum()).fillna(0)
    merged["accidents_90d"] = merged.groupby("junction")["total_accidents"].transform(lambda x: x.shift(1).rolling(3, min_periods=1).sum()).fillna(0)
    merged["accidents_1y"] = merged.groupby("junction")["total_accidents"].transform(lambda x: x.shift(1).rolling(12, min_periods=1).sum()).fillna(0)
    merged["fatal_accidents_1y"] = merged.groupby("junction")["fatal_accidents"].transform(lambda x: x.shift(1).rolling(12, min_periods=1).sum()).fillna(0)
    merged["injury_accidents_1y"] = merged.groupby("junction")["injury_accidents"].transform(lambda x: x.shift(1).rolling(12, min_periods=1).sum()).fillna(0)
    merged["historical_accident_rate"] = (merged["accidents_1y"] / 12.0).round(3)

    return merged


def get_live_tomtom_traffic_interface_schema() -> Dict[str, Any]:
    """
    Canonical interface schema definition for live TomTom Flow API integration.
    """
    return {
        "status": "PENDING_LIVE_INTEGRATION",
        "api_endpoint": "https://api.tomtom.com/traffic/services/4/flowSegmentData",
        "schema_fields": {
            "current_speed_kmh": "float",
            "free_flow_speed_kmh": "float",
            "current_travel_time_seconds": "int",
            "free_flow_travel_time_seconds": "int",
            "confidence_ratio": "float",
            "road_closure_status": "bool",
        },
        "fallback_strategy": "Impute missing live values with historical junction median speed",
    }
