import csv
import json
import logging
import os
from datetime import datetime
from typing import List, Dict, Any
from app.database import SessionLocal, Base, engine
from app.models.junction import Junction
from app.models.police_unit import PoliceUnit
from app.models.incident import Incident
from app.models.recommendation import Recommendation

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed")


def load_dataset_files() -> List[Dict[str, Any]]:
    """Loads junction datasets from datasets/ directory."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    datasets_dir = os.path.join(base_dir, "datasets")

    dataset_files = [
        os.path.join(datasets_dir, "nagpur_second_20_junctions (1).json"),
        os.path.join(datasets_dir, "nagpur_second_20_junctions (2).json")
    ]

    all_junctions: List[Dict[str, Any]] = []

    for file_path in dataset_files:
        if os.path.exists(file_path):
            logger.info(f"Loading dataset from: {file_path}")
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    junctions = data.get("junctions", [])
                    for j in junctions:
                        all_junctions.append({
                            "name": j.get("name"),
                            "latitude": float(j.get("latitude")),
                            "longitude": float(j.get("longitude")),
                            "address": f"{j.get('name')}, Nagpur, Maharashtra ({j.get('source', '')})"
                        })
            except Exception as e:
                logger.error(f"Failed to read dataset file '{file_path}': {str(e)}")
        else:
            logger.warning(f"Dataset file not found: {file_path}")

    return all_junctions


def load_police_units_dataset() -> List[Dict[str, Any]]:
    """Loads police units dataset from datasets/police_units_final.json or .csv."""
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(base_dir, "datasets", "police_units_final.json")
    csv_path = os.path.join(base_dir, "datasets", "police_units_final (2).csv")

    units: List[Dict[str, Any]] = []

    if os.path.exists(json_path):
        logger.info(f"Loading police units dataset from: {json_path}")
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                raw_units = json.load(f)
                for item in raw_units:
                    st = item.get("status", "AVAILABLE").upper()
                    if st == "BUSY":
                        st = "DEPLOYED"
                    elif st == "OFFLINE":
                        st = "UNAVAILABLE"

                    units.append({
                        "id": item.get("unit_id"),
                        "name": f"Unit {item.get('unit_id')} - {item.get('location_name', 'Nagpur Patrol')}",
                        "badge_number": f"NTP-{item.get('unit_id')}",
                        "unit_type": item.get("unit_type", "PATROL").upper(),
                        "status": st,
                        "latitude": float(item.get("latitude")),
                        "longitude": float(item.get("longitude"))
                    })
            return units
        except Exception as e:
            logger.error(f"Failed to parse police units JSON file: {str(e)}")

    if os.path.exists(csv_path):
        logger.info(f"Loading police units dataset from: {csv_path}")
        try:
            with open(csv_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    st = row.get("status", "AVAILABLE").upper()
                    if st == "BUSY":
                        st = "DEPLOYED"
                    elif st == "OFFLINE":
                        st = "UNAVAILABLE"

                    units.append({
                        "id": row.get("unit_id"),
                        "name": f"Unit {row.get('unit_id')} - {row.get('location_name', 'Nagpur Patrol')}",
                        "badge_number": f"NTP-{row.get('unit_id')}",
                        "unit_type": row.get("unit_type", "PATROL").upper(),
                        "status": st,
                        "latitude": float(row.get("latitude")),
                        "longitude": float(row.get("longitude"))
                    })
            return units
        except Exception as e:
            logger.error(f"Failed to parse police units CSV file: {str(e)}")

    return units


def seed_database():
    """Seed initial Nagpur junctions, police units, incidents, and recommendations into Neon PostgreSQL / SQLite."""
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        # 1. Seed Junctions
        dataset_junctions = load_dataset_files()
        existing_names = {name for (name,) in session.query(Junction.name).all()}
        
        inserted_count = 0
        for j_data in dataset_junctions:
            name = j_data["name"]
            if name in existing_names:
                continue

            junction = Junction(
                name=name,
                latitude=j_data["latitude"],
                longitude=j_data["longitude"],
                address=j_data["address"]
            )
            session.add(junction)
            existing_names.add(name)
            inserted_count += 1

        session.commit()
        total_junctions = session.query(Junction).count()
        logger.info(f"Total Junctions in Neon DB: {total_junctions}")

        # 2. Seed Police Units from police_units_final dataset
        pu_dataset = load_police_units_dataset()
        if not pu_dataset:
            pu_dataset = [
                {"id": "PU001", "name": "Unit PU001 - LIC Chowk Patrol", "badge_number": "NTP-PU001", "unit_type": "PATROL", "status": "AVAILABLE", "latitude": 21.1556187, "longitude": 79.0817574},
                {"id": "PU002", "name": "Unit PU002 - Lokmat Chowk Response", "badge_number": "NTP-PU002", "unit_type": "RESPONSE", "status": "AVAILABLE", "latitude": 21.1354806, "longitude": 79.0780286},
                {"id": "PU003", "name": "Unit PU003 - Gaddi Godam Response", "badge_number": "NTP-PU003", "unit_type": "RESPONSE", "status": "AVAILABLE", "latitude": 21.1616305, "longitude": 79.083725},
            ]

        unit_count = 0
        for u in pu_dataset:
            existing = session.query(PoliceUnit).filter(PoliceUnit.id == u["id"]).first()
            if not existing:
                session.add(PoliceUnit(**u))
                unit_count += 1
            else:
                existing.name = u["name"]
                existing.unit_type = u["unit_type"]
                existing.latitude = u["latitude"]
                existing.longitude = u["longitude"]

        session.commit()
        total_units = session.query(PoliceUnit).count()
        logger.info(f"Police Units in Neon DB: {total_units}")

        # 3. Seed Demo Incidents
        first_j = session.query(Junction).first()
        j_id = first_j.id if first_j else 1

        incidents_data = [
            {
                "id": "inc_001",
                "location_id": j_id,
                "timestamp": datetime.utcnow(),
                "type": "ACCIDENT",
                "severity": "HIGH",
                "status": "ACTIVE",
                "description": "Two-vehicle collision reported near Sitabuldi Interchange",
                "is_simulated": False
            },
            {
                "id": "inc_002",
                "location_id": j_id,
                "timestamp": datetime.utcnow(),
                "type": "CONGESTION",
                "severity": "MEDIUM",
                "status": "ACTIVE",
                "description": "Heavy traffic bottleneck near Variety Square",
                "is_simulated": False
            }
        ]
        for inc in incidents_data:
            if not session.query(Incident).filter(Incident.id == inc["id"]).first():
                session.add(Incident(**inc))
        session.commit()

        # 4. Seed Recommendations
        recs_data = [
            {
                "id": "rec_001",
                "location_id": j_id,
                "unit_id": "PU001",
                "reason": "High risk accident & peak congestion at intersection",
                "priority": "HIGH",
                "status": "PENDING"
            },
            {
                "id": "rec_002",
                "location_id": j_id,
                "unit_id": "PU002",
                "reason": "Routine traffic flow regulation & monitoring",
                "priority": "MEDIUM",
                "status": "PENDING"
            }
        ]
        for rec in recs_data:
            if not session.query(Recommendation).filter(Recommendation.id == rec["id"]).first():
                session.add(Recommendation(**rec))
        session.commit()

        logger.info("Successfully seeded police_units_final dataset into Neon DB!")

    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding database: {str(e)}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    seed_database()
