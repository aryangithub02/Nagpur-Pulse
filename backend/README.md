# Nagpur Pulse Backend Service

FastAPI REST API backend service for Nagpur Pulse traffic risk monitoring, police response dispatch, ML model inference, TomTom Routing integration, and Neon PostgreSQL data persistence.

---

## Technical Architecture & Service Layer

```text
Frontend UI (React/Vite)
       │
       ▼
FastAPI Routers (Thin Controller Layer)
       │
       ▼
Service Layer Architecture
 ├── TrafficService      (Telemetry & observations state management)
 ├── IncidentService     (Incidents lifecycle & simulation handling)
 ├── PoliceUnitService   (Police response units & status transitions)
 ├── RoutingService      (TomTom routing & GeoJSON geometry calculation)
 ├── CoverageService     (City-wide police response coverage metrics)
 ├── RiskService         (ML model prediction & risk assessments)
 └── DeploymentService   (Orchestration & transactional unit dispatch)
       │
       ├──► ModelService   ──► ML Model (.joblib)
       ├──► TomTomService  ──► TomTom Routing API
       │
       ▼
SQLAlchemy 2.0 ORM Repositories
       │
       ▼
Neon PostgreSQL Cloud Database
```

---

## Service Responsibilities & Mapping

| Service Module | File Location | Key Responsibilities | API Mapping |
| :--- | :--- | :--- | :--- |
| **`TrafficService`** | [`app/services/traffic_service.py`](file:///c:/Users/lenovo/OneDrive/Desktop/Nagpur%20Pulse/Nagpur-Pulse/backend/app/services/traffic_service.py) | Fetch/store observations & traffic telemetry | `GET /api/traffic`, `GET /api/traffic/{locationId}` |
| **`IncidentService`** | [`app/services/incident_service.py`](file:///c:/Users/lenovo/OneDrive/Desktop/Nagpur%20Pulse/Nagpur-Pulse/backend/app/services/incident_service.py) | Fetch/create incidents & run simulation flow | `GET /api/incidents`, `POST /api/simulation/incident` |
| **`PoliceUnitService`** | [`app/services/police_unit_service.py`](file:///c:/Users/lenovo/OneDrive/Desktop/Nagpur%20Pulse/Nagpur-Pulse/backend/app/services/police_unit_service.py) | Units query, status transition & availability checks | `GET /api/police-units`, `/available`, `/{unitId}` |
| **`RoutingService`** | [`app/services/routing_service.py`](file:///c:/Users/lenovo/OneDrive/Desktop/Nagpur%20Pulse/Nagpur-Pulse/backend/app/services/routing_service.py) | Orchestrate coordinates & GeoJSON line geometry | `GET /api/routing/unit/{unitId}/to/{junctionId}` |
| **`CoverageService`** | [`app/services/coverage_service.py`](file:///c:/Users/lenovo/OneDrive/Desktop/Nagpur%20Pulse/Nagpur-Pulse/backend/app/services/coverage_service.py) | Compute coverage % and location breakdown | `GET /api/coverage`, `GET /api/coverage/{locationId}` |
| **`RiskService`** | [`app/services/risk_service.py`](file:///c:/Users/lenovo/OneDrive/Desktop/Nagpur%20Pulse/Nagpur-Pulse/backend/app/services/risk_service.py) | ML model predictions & bulk query optimization | `GET /api/risk`, `GET /api/risk/{locationId}` |
| **`DeploymentService`**| [`app/services/deployment_service.py`](file:///c:/Users/lenovo/OneDrive/Desktop/Nagpur%20Pulse/Nagpur-Pulse/backend/app/services/deployment_service.py)| Candidate unit ETA ranking & transactional dispatch | `GET /api/recommendations`, `/accept`, `/reject`, `GET /api/deployments` |

---

## Quick Start & Setup Guide (Windows)

### 1. Checkout `develop` Branch & Navigate to `backend/`

```powershell
git checkout develop
cd backend
```

### 2. Create & Activate Virtual Environment

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```powershell
pip install -r requirements.txt
```

### 4. Configure Environment Variables (`.env`)

Copy `.env.example` to `.env`:

```powershell
copy .env.example .env
```

Ensure `.env` contains your Neon PostgreSQL database string and TomTom API key:

```env
# Application Settings
APP_NAME="Nagpur Pulse Backend API"
ENVIRONMENT="development"
DEBUG=True
HOST="0.0.0.0"
PORT=8000

# CORS & Frontend Origin Settings
FRONTEND_URL="http://localhost:3000"
CORS_ORIGINS="http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,*"

# Database Settings (Neon PostgreSQL)
DATABASE_URL="postgresql+psycopg://username:password@host/database?sslmode=require"

# ML Model Settings
MODEL_PATH="app/ml/model.joblib"
ENABLE_MOCK_FALLBACK=True

# TomTom Routing API Settings (Server-side ONLY)
TOMTOM_API_KEY="your_tomtom_api_key_here"
TOMTOM_BASE_URL="https://api.tomtom.com"
```

### 5. Run Database Migrations

```powershell
alembic upgrade head
```

### 6. Seed Nagpur Junctions & Police Unit Datasets

```powershell
python seed.py
```

### 7. Run Automated Pytest Suite

```powershell
pytest tests/
```

### 8. Start FastAPI Server

```powershell
uvicorn app.main:app --reload
```

Interactive API Swagger UI: `http://127.0.0.1:8000/docs`
