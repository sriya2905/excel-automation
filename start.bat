@echo off
echo Starting Material Test Report Generator...
echo.
echo [1/2] Starting Backend (FastAPI on port 8000)...
start cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe app.py"
echo.
echo [2/2] Starting Frontend (HTTP server on port 3000)...
start cmd /k "cd /d "%~dp0frontend\public" && python -m http.server 3000"
echo.
echo Both servers started!
echo   Backend : http://127.0.0.1:8000
echo   Frontend: http://127.0.0.1:3000/app.html
echo.
echo Open your browser to: http://127.0.0.1:3000/app.html
pause
