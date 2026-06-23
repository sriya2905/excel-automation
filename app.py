"""
Root-level entry point for Render deployment.

Render runs from the repo root, but all application code lives inside
the `backend/` directory and uses flat imports like `from models.schemas
import ...`.  We fix this by inserting `backend/` at the front of
sys.path before any application module is imported, then re-export the
FastAPI `app` object so Uvicorn can find it.
"""
import sys
import os
from pathlib import Path

# ── ensure the backend package directory is on the module search path ──────
BACKEND_DIR = Path(__file__).resolve().parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Change working directory to backend so relative paths inside the app
# (uploads/, outputs/, data/, .env, .env.auth) all resolve correctly.
os.chdir(BACKEND_DIR)

# ── import the real application (all flat imports now work) ────────────────
# We cannot just do `from app import app` because Python would see the
# current file (this root app.py) instead of backend/app.py.
# Use importlib to load backend/app.py by file path explicitly.
import importlib.util as _ilu

_spec = _ilu.spec_from_file_location("backend_app", BACKEND_DIR / "app.py")
_backend_app_module = _ilu.module_from_spec(_spec)
_spec.loader.exec_module(_backend_app_module)

app = _backend_app_module.app  # the FastAPI instance

__all__ = ["app"]
