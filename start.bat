@echo off
title Procurement Centre Portal - Launcher
color 0A

echo =====================================================================
echo           PROCUREMENT CENTRE PORTAL - STARTUP LAUNCHER
echo =====================================================================
echo.
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "Procurement Backend (FastAPI :8000)" cmd /k "cd /d \"%~dp0backend\" && .\venv\Scripts\activate && uvicorn main:app --reload --port 8000"

echo [2/2] Starting Next.js Frontend on http://localhost:3000 ...
start "Procurement Frontend (Next.js :3000)" cmd /k "cd /d \"%~dp0frontend\" && npm run dev"

echo.
echo =====================================================================
echo  Both services launched in separate windows!
echo  - Backend API & Swagger UI: http://localhost:8000/docs
echo  - Frontend Kisan Portal:    http://localhost:3000
echo =====================================================================
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:3000

echo Done. You can close this launcher window (leave the backend & frontend windows running).
