"""
Junction Feature Engineering Module.
Merges junction metadata and computes distance to Zero Mile City Center.
"""

import json
from pathlib import Path
from typing import Optional, Dict, Any
import pandas as pd
import numpy as np

# Zero Mile Freedom Park Nagpur Reference Coordinates
ZERO_MILE_LAT = 21.1458
ZERO_MILE_LON = 79.0882


def haversine_distance(lat1: float, lon1: float, lat2: float = ZERO_MILE_LAT, lon2: float = ZERO_MILE_LON) -> float:
    """
    Calculate Haversine distance in kilometers between two lat/lon coordinates.
    """
    R = 6371.0  # Earth radius in kilometers
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = (
        np.sin(dlat / 2.0) ** 2
        + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon / 2.0) ** 2
    )
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return round(float(R * c), 3)


class JunctionFeatureExtractor:
    """
    Attaches junction coordinates, zones, priority levels, and distance to city center.
    """

    def __init__(self, raw_data_dir: Optional[Path] = None):
        self.raw_data_dir = (
            Path(raw_data_dir)
            if raw_data_dir
            else Path(__file__).resolve().parent.parent.parent / "data" / "raw"
        )
        self.junction_meta = self._load_junction_metadata()

    def _load_junction_metadata(self) -> Dict[str, Dict[str, Any]]:
        meta_dict = {}
        j_file1 = self.raw_data_dir / "nagpur_second_20_junctions (1).json"
        if j_file1.exists():
            try:
                with open(j_file1, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for item in data:
                        name = item.get("name", "").strip()
                        if name:
                            meta_dict[name] = {
                                "latitude": float(item.get("latitude", ZERO_MILE_LAT)),
                                "longitude": float(item.get("longitude", ZERO_MILE_LON)),
                                "zone": str(item.get("zone", "Central Zone")).strip(),
                                "priority_level": str(item.get("priority_level", "MEDIUM")).strip(),
                            }
            except Exception:
                pass
        return meta_dict

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()

        if "junction" not in df.columns:
            return df

        # Map coordinates and zone metadata cleanly without row multiplication
        lats = []
        lons = []
        zones = []
        priorities = []
        dist_center = []

        for j_name in df["junction"]:
            info = self.junction_meta.get(str(j_name).strip(), {})
            lat = info.get("latitude", ZERO_MILE_LAT)
            lon = info.get("longitude", ZERO_MILE_LON)
            zone = info.get("zone", "Central Zone")
            prio = info.get("priority_level", "MEDIUM")

            lats.append(lat)
            lons.append(lon)
            zones.append(zone)
            priorities.append(prio)
            dist_center.append(haversine_distance(lat, lon))

        df["latitude"] = lats
        df["longitude"] = lons
        df["zone"] = zones
        df["priority_level"] = priorities
        df["distance_to_city_center"] = dist_center

        return df
