# Procurement Centre Portal - PowerShell Launcher
$rootDir = $PSScriptRoot

Write-Host "=====================================================================" -ForegroundColor Green
Write-Host "          PROCUREMENT CENTRE PORTAL - POWERSHELL LAUNCHER" -ForegroundColor Green
Write-Host "=====================================================================" -ForegroundColor Green
Write-Host ""

Write-Host "Starting Backend (FastAPI on Port 8000)..." -ForegroundColor Cyan
Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$rootDir\backend\run.bat`""

Write-Host "Starting Frontend (Next.js on Port 3000)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$rootDir\frontend\run.bat`""

Write-Host ""
Write-Host "Backend API:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Frontend App: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
