import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

logger = logging.getLogger("health_route")

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Service health check")
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint to verify backend service and Neon PostgreSQL database status."""
    db_status = "disconnected"
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        logger.error(f"Health check DB connection error: {str(e)}")

    return {
        "status": "ok",
        "service": "Nagpur Pulse Backend",
        "database": db_status
    }
