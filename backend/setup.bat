@echo off
cd /d "%~dp0"
echo Setting up authentication...
python setup_auth.py
echo.
echo Authentication ready!
echo You can now start the application.
pause
