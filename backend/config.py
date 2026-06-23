import os

import secrets

from pathlib import Path



from dotenv import load_dotenv



BASE_DIR = Path(__file__).resolve().parent

ENV_FILE = BASE_DIR / ".env"
AUTH_FILE = BASE_DIR / ".env.auth"



load_dotenv(ENV_FILE)



DATA_DIR = BASE_DIR / "data"

MECHANICAL_REQUIREMENTS_FILENAMES = (
    "mechanical_specified.xlsx",
    "Mechanical_properties_Requriment.xlsx",
    "Mechanical_properties_Requirement.xlsx",
)


def resolve_mechanical_requirements_path(filename: str | None = None) -> str | None:
    """Uploaded file in uploads/, or bundled file in backend/data/."""
    import os

    if filename:
        uploaded = BASE_DIR / "uploads" / os.path.basename(filename)
        if uploaded.is_file():
            return str(uploaded)
    uploaded_default = BASE_DIR / "uploads" / "mechanical_specified.xlsx"
    if uploaded_default.is_file():
        return str(uploaded_default)
    for name in MECHANICAL_REQUIREMENTS_FILENAMES:
        bundled = DATA_DIR / name
        if bundled.is_file():
            return str(bundled)
    return None



JWT_SECRET = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET") or ""

JWT_ALGORITHM = "HS256"

JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "12"))



FIXED_USERS = [

    "Mahesh Chavan",

    "Rahul Karape",

    "Digember",

    "Q/A Lab",

]



ENV_HASH_KEYS = {

    "Mahesh Chavan": "PASSWORD_HASH_MAHESH_CHAVAN",

    "Rahul Karape": "PASSWORD_HASH_RAHUL_KARAPE",

    "Digember": "PASSWORD_HASH_DIGEMBER",

    "Q/A Lab": "PASSWORD_HASH_QA_LAB",

}





def load_password_hashes() -> dict[str, str]:
    """Load bcrypt hashes from env vars, with backend/.env.auth as fallback."""

    import json

    load_dotenv(ENV_FILE, override=True)

    hashes: dict[str, str] = {}

    for username, env_key in ENV_HASH_KEYS.items():
        value = (os.getenv(env_key) or "").strip()
        if value:
            hashes[username] = value

    if AUTH_FILE.is_file():
        try:
            payload = json.loads(AUTH_FILE.read_text(encoding="utf-8"))
            users = payload.get("users") if isinstance(payload, dict) else {}
            if isinstance(users, dict):
                for username, hashed in users.items():
                    if str(hashed).strip() and username not in hashes:
                        hashes[str(username)] = str(hashed)
        except Exception:
            pass

    return hashes


def auth_is_configured() -> bool:
    """True when every fixed user has a bcrypt hash (env vars or .env.auth)."""
    hashes = load_password_hashes()
    return all(hashes.get(username) for username in FIXED_USERS)





def ensure_jwt_secret() -> str:
    """Return JWT secret from env, or generate and persist one (local dev only)."""

    global JWT_SECRET

    secret = os.getenv("JWT_SECRET_KEY") or os.getenv("JWT_SECRET") or JWT_SECRET

    if secret:
        JWT_SECRET = secret
        return secret

    if os.getenv("RENDER"):
        raise RuntimeError(
            "JWT_SECRET_KEY is not set. Add it in the Render dashboard under Environment."
        )

    secret = secrets.token_urlsafe(48)

    from services.env_file import write_env_updates

    write_env_updates({"JWT_SECRET_KEY": secret})
    load_dotenv(ENV_FILE, override=True)
    JWT_SECRET = secret
    return secret

