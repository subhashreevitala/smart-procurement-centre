@echo off
title Procurement Centre Portal - Database Seeder
color 0B

echo =====================================================================
echo         PROCUREMENT CENTRE PORTAL - DATABASE SEEDER
echo =====================================================================
echo.
echo Seeding initial Mandi centres, crops, demo farmers, and bookings...
cd /d "%~dp0backend"
call .\venv\Scripts\activate
python scripts\seed_data.py
echo.
echo =====================================================================
echo Database seeding complete!
echo =====================================================================
pause
