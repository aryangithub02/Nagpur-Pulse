from datetime import datetime
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field, ConfigDict


class ObservationCreate(BaseModel):
    """Schema for recording a raw traffic observation."""
    junction_id: int = Field(..., description="Target junction ID", example=1)
    timestamp: Optional[datetime] = Field(
        None, description="Observation timestamp (defaults to current server time if omitted)"
    )
    traffic_data: Dict[str, Any] = Field(
        ...,
        description="Arbitrary key-value dictionary of raw traffic data/features",
        example={
            "speed": 45.5,
            "density": 120,
            "weather": "rainy",
            "hour": 18
        }
    )


class ObservationResponse(BaseModel):
    """Schema for returning created traffic observation."""
    id: int = Field(..., description="Unique observation ID")
    junction_id: int = Field(..., description="Associated junction ID")
    timestamp: datetime = Field(..., description="Timestamp of the observation")
    traffic_data: Dict[str, Any] = Field(..., description="Traffic observation data")
    created_at: datetime = Field(..., description="Record creation timestamp")

    model_config = ConfigDict(from_attributes=True)
