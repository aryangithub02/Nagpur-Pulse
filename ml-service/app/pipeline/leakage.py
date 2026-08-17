"""
Data Leakage Prevention Engine for Nagpur Pulse ML Service.
Identifies and drops columns containing post-incident or future information.
"""

from typing import Dict, Any, List, Tuple
import pandas as pd
import logging

logger = logging.getLogger("NagpurPulse.Leakage")

LEAKAGE_COLUMN_BLACKLIST = {
    "policecaseregistered": "Generated only after police investigation finishes.",
    "fatalitycount": "Post-accident medical outcome; unavailable before event.",
    "injuredcount": "Post-accident casualty count; unavailable before event.",
    "vehiclesinvolved": "Post-collision count recorded by scene investigators.",
    "probablecause": "Post-investigation cause assignment.",
    "primaryvehicletype": "Vehicle classification recorded after crash report filed.",
    "total_fatalities": "Aggregated post-accident outcome.",
    "total_injured": "Aggregated post-accident outcome.",
}


def remove_leakage_columns(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Remove all data leakage columns from features dataset.
    """
    df = df.copy()
    removed_cols = []
    reasons = {}

    for col in df.columns:
        clean_col = col.strip().lower()
        if clean_col in LEAKAGE_COLUMN_BLACKLIST:
            removed_cols.append(col)
            reasons[col] = LEAKAGE_COLUMN_BLACKLIST[clean_col]

    if removed_cols:
        df = df.drop(columns=removed_cols)
        logger.info(f"Removed {len(removed_cols)} data leakage columns: {removed_cols}")

    metadata = {
        "removed_columns_count": len(removed_cols),
        "removed_columns": removed_cols,
        "rationale": reasons,
    }
    return df, metadata
