"""Cloud entrypoint for the Material Test Report Generator API."""
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
_BACKEND_CANDIDATE = ROOT_DIR / "backend"
BACKEND_DIR = _BACKEND_CANDIDATE if (_BACKEND_CANDIDATE / "models").is_dir() else ROOT_DIR

for module_dir in (BACKEND_DIR, ROOT_DIR):
    module_path = str(module_dir)
    if module_path not in sys.path:
        sys.path.insert(0, module_path)

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from models.schemas import AuthLoginRequest
from routes.auth_routes import router as auth_router
from routes.report_routes import router as report_router
from services.auth_service import AuthService


app = FastAPI(title="Material Test Report Generator API")
_auth = AuthService()

FRONTEND_PUBLIC = ROOT_DIR / "frontend" / "public"
FRONTEND_BUILD = ROOT_DIR / "frontend" / "build"
UPLOADS_DIR = BACKEND_DIR / "uploads"
OUTPUTS_DIR = BACKEND_DIR / "outputs"
DATA_DIR = BACKEND_DIR / "data"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def check_auth_configured() -> bool:
    return _auth.is_configured()


def _login_response(body: AuthLoginRequest) -> dict:
    if not check_auth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured. Run setup.bat or use the Initial Setup screen.",
        )
    if not _auth.verify_login(body.username, body.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    token = _auth.create_token(body.username)
    return {"token": token, "username": body.username, "status": "success"}


@app.post("/login")
@app.post("/api/login")
def login(body: AuthLoginRequest):
    """Login endpoint (also available at /api/auth/login)."""
    return _login_response(body)


for directory in (UPLOADS_DIR, OUTPUTS_DIR, DATA_DIR):
    directory.mkdir(exist_ok=True)

app.include_router(auth_router, prefix="/api")
app.include_router(report_router, prefix="/api", tags=["Reports"])


@app.on_event("startup")
def on_startup():
    if check_auth_configured():
        print("\n[AUTH] Authentication configured.\n")
    elif os.getenv("RENDER"):
        print(
            "\n[AUTH] Passwords not configured. Set PASSWORD_HASH_* env vars in Render "
            "or use POST /api/auth/setup once after deploy.\n"
        )
    else:
        print("\n[AUTH] Passwords not configured - run backend/setup.bat first.\n")


@app.get("/api/health")
def api_health():
    return {
        "message": "Material Test Report Generator API",
        "status": "running",
        "auth_configured": check_auth_configured(),
    }


def _ui_index_path() -> Path:
    app_html = FRONTEND_PUBLIC / "app.html"
    if app_html.is_file():
        return app_html
    build_index = FRONTEND_BUILD / "index.html"
    if build_index.is_file():
        return build_index
    return FRONTEND_PUBLIC / "index.html"


@app.get("/")
def serve_ui():
    """Serve the login / report UI (not the raw API JSON)."""
    index = _ui_index_path()
    if not index.is_file():
        return {
            "message": "Material Test Report Generator API",
            "status": "running",
            "auth_configured": check_auth_configured(),
            "hint": "Frontend files missing. Run start-frontend.bat to build the UI.",
        }
    return FileResponse(index)


if FRONTEND_BUILD.is_dir() and (FRONTEND_BUILD / "static").is_dir():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD / "static")), name="react-static")


_PUBLIC_ASSETS = ("style.css", "script.js", "sgil-logo.png", "favicon.ico", "robots.txt")


def _public_file(name: str) -> FileResponse:
    path = FRONTEND_PUBLIC / name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(path)


for _asset in _PUBLIC_ASSETS:
    app.add_api_route(f"/{_asset}", lambda n=_asset: _public_file(n), methods=["GET"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
