@echo off
echo ========================================================
echo  Starting AI Pothole Detection Backend (FastAPI)
echo ========================================================
cd /d "%~dp0\.."
if exist "backend\.venv\Scripts\activate.bat" (
    call backend\.venv\Scripts\activate.bat
) else (
    echo [ERROR] Virtual environment not found in backend\.venv
    pause
    exit /b 1
)

echo Initializing database tables and starting Uvicorn server on http://127.0.0.1:8000...
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
pause
