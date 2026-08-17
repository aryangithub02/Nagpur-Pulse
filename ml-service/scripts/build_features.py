"""
CLI Script: Build Model Feature Vector for a Junction.
Usage:
    python scripts/build_features.py --junction "Sitabuldi Chowk"
"""

import sys
import argparse
import json
from pathlib import Path
import pandas as pd

# Ensure ml-service root is in sys.path
SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.config import PROCESSED_ACCIDENTS_CLEAN_PATH
from app.pipeline.accident_ingestion import ingest_historical_accidents
from app.pipeline.junction_matcher import match_junction
from app.pipeline.feature_engineering import calculate_junction_features
from app.pipeline.feature_assembler import assemble_full_pipeline_response

def build_features_for_junction(
    junction_query: str,
    prediction_timestamp: str = None
) -> dict:
    # Ensure processed accidents dataset exists
    if not PROCESSED_ACCIDENTS_CLEAN_PATH.exists():
        print("Processed dataset not found. Running ingestion...")
        ingest_historical_accidents()

    accidents_df = pd.read_csv(PROCESSED_ACCIDENTS_CLEAN_PATH)

    # Match junction
    match_result = match_junction(junction_query)
    canonical_name = match_result["canonical_name"]
    location_id = match_result["location_id"]

    eval_time = pd.to_datetime(prediction_timestamp) if prediction_timestamp else pd.Timestamp.now()

    # Feature engineering
    raw_features = calculate_junction_features(
        accidents_df,
        canonical_name,
        prediction_time=eval_time
    )

    # Feature assembly
    assembled = assemble_full_pipeline_response(
        location_id=location_id,
        canonical_junction_name=canonical_name,
        historical_features=raw_features,
        data_source_provenance="SIMULATED"
    )

    return assembled

def main():
    parser = argparse.ArgumentParser(description="Build feature vector for a junction")
    parser.add_argument("--junction", type=str, default="Sitabuldi Chowk", help="Junction query string")
    parser.add_argument("--timestamp", type=str, default=None, help="Prediction ISO timestamp")
    args = parser.parse_args()

    print("=" * 70)
    print("NAGPUR PULSE - FEATURE BUILDING PIPELINE")
    print("=" * 70)

    try:
        response = build_features_for_junction(args.junction, args.timestamp)
        print("\nFEATURE VECTOR OUTPUT:")
        print("-" * 70)
        print(json.dumps(response, indent=2))
        print("\n" + "=" * 70)
        print("FEATURE BUILDING COMPLETE")
        print("=" * 70)

    except Exception as exc:
        print(f"\nFeature building failed: {exc}")
        sys.exit(1)

if __name__ == "__main__":
    main()
