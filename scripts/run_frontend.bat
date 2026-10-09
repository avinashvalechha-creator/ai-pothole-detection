@echo off
echo ========================================================
echo  Starting AI Pothole Detection Frontend (React + Vite)
echo ========================================================
cd /d "%~dp0\..\frontend"
set PATH=C:\Program Files\nodejs;%PATH%

echo Launching Vite development server at http://localhost:5173...
npm.cmd run dev
pause
