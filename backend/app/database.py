import os
import logging
from typing import Generator
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("database")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nagpur_pulse.db")

# Normalize postgresql:// scheme to postgresql+psycopg:// for SQLAlchemy + psycopg3
if DATABASE_URL.startswith("postgresql://") and not DATABASE_URL.startswith("postgresql+"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

# Configure engine with pooling optimized for Neon serverless PostgreSQL or local SQLite
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,  # Test connection liveness before executing queries
        pool_size=5,
        max_overflow=10,
        pool_recycle=300,    # Recycle connections every 5 minutes for cloud resiliency
    )

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base class for SQLAlchemy ORM models."""
    pass


def ensure_db_schema():
    """Ensures database tables exist and performs automatic column migration for predictions table."""
    try:
        import app.models.junction
        import app.models.observation
        import app.models.prediction
        import app.models.incident
        import app.models.police_unit
        import app.models.deployment
        import app.models.recommendation
        import app.models.audit_log
        import app.models.user
        import app.models.zone
        import app.models.weather
        import app.models.decision_evidence
    except Exception as err:
        logger.warning(f"Model import error during ensure_db_schema: {err}")

    Base.metadata.create_all(bind=engine)
    
    # Auto-add missing columns to existing predictions table
    try:
        inspector = inspect(engine)
        if "predictions" in inspector.get_table_names():
            columns = {col["name"] for col in inspector.get_columns("predictions")}
            needed_columns = {
                "junction_id_str": "VARCHAR(50)",
                "prediction_time": "TIMESTAMP",
                "risk_level": "VARCHAR(50)",
                "risk_score": "FLOAT",
                "probability_low": "FLOAT",
                "probability_medium": "FLOAT",
                "probability_high": "FLOAT",
                "probability_critical": "FLOAT",
                "model_name": "VARCHAR(100)",
                "model_version": "VARCHAR(50)",
                "feature_version": "VARCHAR(50)",
            }
            with engine.connect() as conn:
                for col_name, col_type in needed_columns.items():
                    if col_name not in columns:
                        logger.info(f"Auto-migrating predictions table: adding column '{col_name}'")
                        conn.execute(text(f"ALTER TABLE predictions ADD COLUMN {col_name} {col_type}"))
                conn.commit()
    except Exception as err:
        logger.warning(f"Database column auto-migration warning: {err}")


ensure_db_schema()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that provides a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
