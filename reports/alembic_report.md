# Nagpur Pulse Backend — Alembic Migration Report

**Project**: Nagpur Pulse Traffic Monitoring Platform  
**Phase**: Phase 3 Database Migrations  
**Tool**: Alembic 1.19+  
**Target Database**: Neon PostgreSQL  
**Report Date**: August 17, 2026  

---

## 1. Overview & Setup

Alembic is configured as the formal database migration engine for Nagpur Pulse, replacing transient `Base.metadata.create_all()` calls to guarantee reproducible DDL version control.

### Directory Structure

```text
backend/
├── alembic.ini
└── alembic/
    ├── env.py
    ├── README
    ├── script.py.mako
    └── versions/
        └── e9b3c521bc13_initial_phase_3_schema_migration.py
```

---

## 2. Dynamic Environment Configuration (`alembic/env.py`)

Configured `alembic/env.py` to read `DATABASE_URL` dynamically from `.env`:

```python
import os
import sys
from dotenv import load_dotenv
from alembic import context
from app.database import Base
import app.models  # Registers all ORM models with Base.metadata

load_dotenv()

db_url = os.getenv("DATABASE_URL")
if db_url:
    if db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)
    config.set_main_option("sqlalchemy.url", db_url)

target_metadata = Base.metadata
```

---

## 3. Initial Migration Script (`e9b3c521bc13`)

- **Revision ID**: `e9b3c521bc13`
- **Revises**: `None` (Initial Schema)
- **Description**: Initial Phase 3 schema migration creating `junctions`, `traffic_observations`, and `predictions` tables.

### Generated DDL Summary

```python
def upgrade() -> None:
    # 1. Create junctions table
    op.create_table(
        'junctions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('address', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_junctions_id'), 'junctions', ['id'], unique=False)
    op.create_index(op.f('ix_junctions_name'), 'junctions', ['name'], unique=False)

    # 2. Create predictions table
    op.create_table(
        'predictions',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('junction_id', sa.Integer(), nullable=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('prediction', sa.String(length=255), nullable=False),
        sa.Column('probability', sa.Float(), nullable=True),
        sa.Column('is_mock', sa.Boolean(), nullable=True),
        sa.Column('features_used', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['junction_id'], ['junctions.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_predictions_id'), 'predictions', ['id'], unique=False)
    op.create_index(op.f('ix_predictions_junction_id'), 'predictions', ['junction_id'], unique=False)
    op.create_index(op.f('ix_predictions_timestamp'), 'predictions', ['timestamp'], unique=False)

    # 3. Create traffic_observations table
    op.create_table(
        'traffic_observations',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('junction_id', sa.Integer(), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('traffic_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['junction_id'], ['junctions.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_traffic_observations_id'), 'traffic_observations', ['id'], unique=False)
    op.create_index(op.f('ix_traffic_observations_junction_id'), 'traffic_observations', ['junction_id'], unique=False)
    op.create_index(op.f('ix_traffic_observations_timestamp'), 'traffic_observations', ['timestamp'], unique=False)
```

---

## 4. Execution & Verification Log

Executed against live Neon PostgreSQL:

```powershell
(venv) PS C:\Users\lenovo\OneDrive\Desktop\Nagpur Pulse\Nagpur-Pulse\backend> alembic upgrade head
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> e9b3c521bc13, Initial Phase 3 schema migration
```

Current revision in `alembic_version` table on Neon: `e9b3c521bc13`.

---

## 5. Command Reference

### Apply Migrations
```powershell
.\venv\Scripts\Activate.ps1
alembic upgrade head
```

### Auto-generate New Migration
```powershell
alembic revision --autogenerate -m "Description of model changes"
```

### Rollback Last Migration
```powershell
alembic downgrade -1
```
