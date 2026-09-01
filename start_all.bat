@echo off
title Nagpur Pulse - System Launcher
color 0b

echo ======================================================================
echo           NAGPUR PULSE - URBAN INTELLIGENCE & POLICE DISPATCH
echo                     Starting All Microservices...
echo ======================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

:: Determine Python executable from backend venv if available
if exist "%ROOT_DIR%backend\venv\Scripts\python.exe" (
    set "PYTHON_EXE=%ROOT_DIR%backend\venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

:: 1. Start ML Service (Port 8001)
echo [1/3] Launching ML Service on http://localhost:8001 ...
start "Nagpur Pulse - ML Service (Port 8001)" cmd /k "cd /d "%ROOT_DIR%ml-service" && title Nagpur Pulse ML Service && echo [ML SERVICE - Port 8001] Starting... && "%PYTHON_EXE%" app/main.py"

:: Small delay to avoid port race conditions
timeout /t 2 /nobreak >nul

:: 2. Start Backend FastAPI Service (Port 8000)
echo [2/3] Launching FastAPI Backend on http://localhost:8000 ...
start "Nagpur Pulse - Backend API (Port 8000)" cmd /k "cd /d "%ROOT_DIR%backend" && title Nagpur Pulse Backend API && echo [BACKEND API - Port 8000] Starting... && "%PYTHON_EXE%" -m uvicorn app.main:app --reload --port 8000"

:: Small delay before launching frontend
timeout /t 2 /nobreak >nul

:: 3. Start Frontend Vite Dev Server (Port 5173)
echo [3/3] Launching Frontend UI on http://localhost:5173 ...
start "Nagpur Pulse - Frontend UI (Port 5173)" cmd /k "cd /d "%ROOT_DIR%" && title Nagpur Pulse Frontend UI && echo [FRONTEND UI - Port 5173] Starting... && npm run dev"

echo.
echo ======================================================================
echo                     ALL SERVICES ARE STARTING!
echo ======================================================================
echo   - Frontend Dashboard:   http://localhost:5173
echo   - Backend FastAPI Docs: http://localhost:8000/docs
echo   - ML Service API:       http://localhost:8001/api/v1/ml/health
echo ======================================================================
echo.
echo Keep the individual terminal windows open while developing.
echo Press any key to exit this launcher window...
pause >nul
