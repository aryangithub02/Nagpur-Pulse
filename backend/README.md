# Nagpur Pulse Backend

FastAPI service for Nagpur Pulse traffic risk monitoring and ML model integration.

## Quick Start Guide (Windows)

### 1. Create Virtual Environment
```powershell
python -m venv venv
```

### 2. Activate Virtual Environment
```powershell
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 4. Start Server
```powershell
uvicorn app.main:app --reload
```

### 5. Verify Setup
- **Health Check**: `http://127.0.0.1:8000/health`
- **Swagger Documentation**: `http://127.0.0.1:8000/docs`
