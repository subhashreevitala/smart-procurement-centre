@echo off
title Procurement Centre - Frontend Web (Port 3000)
color 0A
cd /d "%~dp0"

echo =====================================================================
echo                 STARTING NEXT.JS FRONTEND PORTAL
echo =====================================================================
echo.
echo URL:       http://localhost:3000
echo Directory: %CD%
echo.

call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend stopped with an error code: %ERRORLEVEL%
    pause
)
