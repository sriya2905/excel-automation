@echo off
cd /d "%~dp0backend"
if not exist venv\Scripts\python.exe (
  echo Creating virtual environment...
  python -m venv venv
)
call venv\Scripts\activate.bat
pip install -r requirements.txt -q
python scripts\setup_passwords.py
pause
