@echo off
cd /d %~dp0\..\backend

REM Create venv if missing
if not exist venv\Scripts\python.exe (
  py -3.11 -m venv venv
)

REM Install deps
venv\Scripts\python.exe -m pip install -q firebase-admin fastapi uvicorn opencv-python mediapipe==0.10.9 numpy

REM Run server
venv\Scripts\python.exe -m uvicorn control_server:app --host 0.0.0.0 --port 8000

pause
