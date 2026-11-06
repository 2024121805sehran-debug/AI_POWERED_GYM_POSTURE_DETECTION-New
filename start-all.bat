@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                                                                      ║
echo ║          🤖 AI GYM POSTURE DETECTION - UNIFIED LAUNCHER               ║
echo ║                                                                      ║
echo ║   Sharda University - PBL-2 (CSP-297) - Semester 4th Term 2502       ║
echo ║   Team 4: Vansh Bhardwaj (2024182457) | Sehran Fayaz (2024121805)     ║
echo ║                                                                      ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo 📍 Project Directory: %PROJECT_DIR%
echo.

:: Check if ports are already in use
echo 🔍 Checking ports...
netstat -ano | findstr :8000 >nul
if %errorlevel% == 0 (
    echo ⚠️  Port 8000 is already in use. Backend may already be running.
    echo.
)
netstat -ano | findstr :3000 >nul
if %errorlevel% == 0 (
    echo ⚠️  Port 3000 is already in use. Frontend may already be running.
    echo.
)

echo 🚀 Starting services...
echo.

:: Start Backend in new window
echo   🖥️  Starting Backend (FastAPI) on http://localhost:8000 ...
start "🖥️ AI Gym Backend" cmd /k "cd /d "%PROJECT_DIR%\backend" && call venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000"

:: Wait for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend in new window  
echo   ⚛️  Starting Frontend (React) on http://localhost:3000 ...
start "⚛️ AI Gym Frontend" cmd /k "cd /d "%PROJECT_DIR%\frontend" && npm install && npm start"

echo.
echo ⏳ Waiting for services to initialize...
timeout /t 8 /nobreak >nul

echo.
echo ╔══════════════════════════════════════════════════════════════════════╗
echo ║                     ✅ SERVICES STARTED SUCCESSFULLY                  ║
echo ╠══════════════════════════════════════════════════════════════════════╣
echo ║                                                                      ║
echo ║   🌐 Dashboard: http://localhost:3000                                ║
echo ║   🔌 API Docs:  http://localhost:8000/docs                          ║
echo ║   📹 Video Feed: http://localhost:8000/video                         ║
echo ║                                                                      ║
echo ║   💡 Press Ctrl+C in each window to stop services                    ║
echo ║                                                                      ║
echo ╚══════════════════════════════════════════════════════════════════════╝
echo.

:: Open browser
echo 🌐 Opening dashboard in browser...
start http://localhost:3000

echo.
echo Press any key to exit this launcher (services will keep running)...
pause >nul
