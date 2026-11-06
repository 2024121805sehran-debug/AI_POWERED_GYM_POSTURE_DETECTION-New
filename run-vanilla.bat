@echo off
echo ==========================================
echo   AI Gym Posture Detection - Vanilla
echo   Sharda University - PBL-2 (CSP-297)
echo ==========================================
echo.
echo Starting Backend Server...
echo.
cd /d "%~dp0"
cd ..\backend
call venv\Scripts\activate
start "Backend" cmd /k "uvicorn main:app --host 0.0.0.0 --port 8000"
echo.
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul
echo.
echo Opening Frontend in browser...
cd /d "%~dp0"
start http://localhost:8000
echo.
echo ==========================================
echo   Services Started:
echo   - Backend: http://localhost:8000
echo   - API Docs: http://localhost:8000/docs
echo ==========================================
echo.
pause
