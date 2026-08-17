"""
Junction Reference Matcher & Normalizer.
Normalizes incoming junction string queries against reference datasets.
"""

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.config import FIRST_20_JUNCTIONS_PATH, SECOND_20_JUNCTIONS_PATH

def normalize_junction_string(name: str) -> str:
    """
    Safe string normalization:
    - strip leading/trailing whitespace
    - lowercase
    - collapse multiple spaces into single space
    """
    if not name or not isinstance(name, str):
        return ""

    text = name.strip().lower()
    text = re.sub(r"\s+", " ", text)
    return text

def slugify_junction_id(name: str) -> str:
    """
    Convert a junction name into a canonical location_id slug.
    e.g. 'Sitabuldi Chowk' -> 'sitabuldi-chowk'
    """
    norm = normalize_junction_string(name)
    slug = re.sub(r"[^a-z0-9]+", "-", norm).strip("-")
    return slug

class JunctionRegistry:
    """
    In-memory junction reference registry loaded from reference JSON files.
    """

    def __init__(self, reference_paths: Optional[List[Path]] = None):
        self.junctions_by_id: Dict[str, Dict[str, Any]] = {}
        self.lookup_map: Dict[str, Tuple[str, str]] = {}  # norm_name -> (location_id, match_type)

        paths = reference_paths or [FIRST_20_JUNCTIONS_PATH, SECOND_20_JUNCTIONS_PATH]
        self.load_references(paths)

    def load_references(self, paths: List[Path]) -> None:
        """
        Load junction definitions from reference JSON files.
        """
        for path in paths:
            file_path = Path(path)
            if not file_path.exists():
                continue

            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)

                junction_list = data.get("junctions", [])
                for item in junction_list:
                    name = item.get("name", "")
                    if not name:
                        continue

                    location_id = item.get("location_id") or slugify_junction_id(name)

                    entry = {
                        "location_id": location_id,
                        "canonical_name": name,
                        "latitude": item.get("latitude"),
                        "longitude": item.get("longitude"),
                        "approximate": item.get("approximate", False),
                        "is_manned": item.get("is_manned", False),
                        "source": item.get("source", ""),
                        "aliases": item.get("aliases", [])
                    }

                    self.junctions_by_id[location_id] = entry

                    # Map canonical name
                    norm_name = normalize_junction_string(name)
                    self.lookup_map[norm_name] = (location_id, "EXACT")

                    # Map aliases
                    for alias in entry["aliases"]:
                        norm_alias = normalize_junction_string(alias)
                        if norm_alias and norm_alias not in self.lookup_map:
                            self.lookup_map[norm_alias] = (location_id, "ALIAS")

            except Exception as exc:
                print(f"Warning: Failed to load reference file {file_path}: {exc}")

    def match_junction(self, query: str) -> Dict[str, Any]:
        """
        Match raw junction query against registry.
        Returns matching metadata or UNMATCHED dict.
        """
        norm_query = normalize_junction_string(query)

        if not norm_query:
            return {
                "location_id": "unmatched",
                "canonical_name": query,
                "match_type": "UNMATCHED",
                "confidence": 0.0,
                "latitude": None,
                "longitude": None,
                "is_manned": False,
            }

        # Check lookup map
        if norm_query in self.lookup_map:
            location_id, match_type = self.lookup_map[norm_query]
            info = self.junctions_by_id[location_id]
            return {
                "location_id": location_id,
                "canonical_name": info["canonical_name"],
                "match_type": match_type,
                "confidence": 1.0,
                "latitude": info["latitude"],
                "longitude": info["longitude"],
                "is_manned": info["is_manned"],
            }

        # Fallback slug match if name contains chowk/square variation
        slug = slugify_junction_id(query)
        if slug in self.junctions_by_id:
            info = self.junctions_by_id[slug]
            return {
                "location_id": slug,
                "canonical_name": info["canonical_name"],
                "match_type": "EXACT",
                "confidence": 1.0,
                "latitude": info["latitude"],
                "longitude": info["longitude"],
                "is_manned": info["is_manned"],
            }

        # UNMATCHED
        return {
            "location_id": slug,
            "canonical_name": query.strip(),
            "match_type": "UNMATCHED",
            "confidence": 0.0,
            "latitude": None,
            "longitude": None,
            "is_manned": False,
        }

_DEFAULT_REGISTRY: Optional[JunctionRegistry] = None

def get_junction_registry() -> JunctionRegistry:
    """
    Get cached default JunctionRegistry instance.
    """
    global _DEFAULT_REGISTRY
    if _DEFAULT_REGISTRY is None:
        _DEFAULT_REGISTRY = JunctionRegistry()
    return _DEFAULT_REGISTRY

def match_junction(query: str) -> Dict[str, Any]:
    """
    Utility function to match a junction string using default registry.
    """
    return get_junction_registry().match_junction(query)
