from pydantic import BaseModel

class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "nagpur-pulse-ml"

class ModelInfoResponse(BaseModel):
    model_version: str
    model_type: str
    status: str = "loaded"

class ErrorResponse(BaseModel):
    detail: str
