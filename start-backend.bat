@echo off
cd /d "%~dp0backend"
echo Stopping any old server on port 8000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000.*LISTENING"') do taskkill /PID %%a /F >nul 2>&1
timeout /t 2 /nobreak >nul
if not exist venv\Scripts\python.exe (
  echo Creating virtual environment...
  python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt -q
echo.
echo Starting app at http://127.0.0.1:8000
echo First time? Run setup.bat to set passwords, then open the URL above.
echo.
python app.py
