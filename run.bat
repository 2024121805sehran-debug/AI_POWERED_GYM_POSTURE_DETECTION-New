@echo off
echo ==========================================
echo   AI Gym Posture Detection
echo   Sharda University - PBL-2 (CSP-297)
echo ==========================================
echo.
echo Starting Backend Server...
echo This will also serve the frontend at http://localhost:8000
echo.
cd /d "%~dp0"
cd backend
call venv\Scripts\activate
echo.
echo Starting server... Press Ctrl+C to stop
echo.
timeout /t 2 /nobreak >nul
start http://localhost:8000
uvicorn main:app --host 0.0.0.0 --port 8000
pause
