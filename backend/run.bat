@echo off
title Procurement Centre - Backend API (Port 8000)
color 0B
cd /d "%~dp0"

echo =====================================================================
echo                 STARTING FASTAPI BACKEND SERVER
echo =====================================================================
echo.
echo URL:      http://localhost:8000
echo Swagger:  http://localhost:8000/docs
echo Directory: %CD%
echo.

if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in %CD%\venv
    echo Please create the virtual environment first.
    pause
    exit /b 1
)

echo Activating virtualenv and launching uvicorn...
call venv\Scripts\activate.bat
venv\Scripts\python.exe -m uvicorn main:app --reload --port 8000

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Backend stopped with an error code: %ERRORLEVEL%
    pause
)
