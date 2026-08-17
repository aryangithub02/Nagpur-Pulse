"""
CLI Script: Ingest Historical Accident Dataset.
Usage:
    python scripts/ingest_accidents.py
"""

import sys
from pathlib import Path

# Ensure ml-service root is in sys.path
SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from app.pipeline.accident_ingestion import ingest_historical_accidents

def main():
    print("=" * 70)
    print("NAGPUR PULSE - ACCIDENT INGESTION PIPELINE")
    print("=" * 70)

    try:
        clean_df, report = ingest_historical_accidents()

        print("\nINGESTION AUDIT REPORT:")
        print("-" * 70)
        print(f"Total Records Ingested : {report['total_records']}")
        print(f"Valid Records          : {report['valid_records']}")
        print(f"Invalid Records        : {report['invalid_records']}")
        print(f"Duplicate Records      : {report['duplicate_records']}")
        print(f"Data Source Provenance : {report['data_source_distribution']}")

        print("\n" + "=" * 70)
        print("ACCIDENT INGESTION COMPLETE")
        print("=" * 70)

    except Exception as exc:
        print(f"\nIngestion failed: {exc}")
        sys.exit(1)

if __name__ == "__main__":
    main()
