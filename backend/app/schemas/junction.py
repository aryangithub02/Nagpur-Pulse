from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict


class JunctionBase(BaseModel):
    """Base schema for Junction fields."""
    name: str = Field(..., description="Name of the traffic junction", example="Sitabuldi Interchange")
    latitude: float = Field(..., description="Latitude coordinate", example=21.1458)
    longitude: float = Field(..., description="Longitude coordinate", example=79.0882)
    address: Optional[str] = Field(None, description="Physical location or address", example="Sitabuldi, Nagpur")


class JunctionCreate(JunctionBase):
    """Schema for creating a new junction."""
    pass


class JunctionResponse(JunctionBase):
    """Schema for returning junction details."""
    id: int = Field(..., description="Unique junction ID")
    created_at: datetime = Field(..., description="Record creation timestamp")

    model_config = ConfigDict(from_attributes=True)


class JunctionListResponse(BaseModel):
    """Schema for returning a collection of junctions."""
    junctions: List[JunctionResponse] = Field(..., description="List of junctions")
