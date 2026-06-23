from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

import bcrypt
import jwt

from config import (
    AUTH_FILE,
    FIXED_USERS,
    JWT_ALGORITHM,
    JWT_EXPIRE_HOURS,
    auth_is_configured,
    ensure_jwt_secret,
    load_password_hashes,
)


class AuthService:
    def _write_auth_file(self, hashes: Dict[str, str]) -> None:
        import json

        AUTH_FILE.write_text(json.dumps({"users": hashes, "configured": True}, indent=2), encoding="utf-8")

    def is_configured(self) -> bool:
        return auth_is_configured()

    def list_usernames(self) -> List[str]:
        return list(FIXED_USERS)

    def verify_login(self, username: str, password: str) -> bool:
        if username not in FIXED_USERS:
            return False

        hashed = load_password_hashes().get(username)
        if not hashed:
            return False

        try:
            return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
        except ValueError:
            return False

    def setup_passwords(self, passwords: Dict[str, str]) -> None:
        updates: Dict[str, str] = {}

        for username, plain in passwords.items():
            if username not in FIXED_USERS:
                continue
            if len(plain) < 4:
                raise ValueError(f"Password for {username} must be at least 4 characters.")
            hashed = bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            updates[username] = hashed

        if len(updates) != len(FIXED_USERS):
            missing = [u for u in FIXED_USERS if u not in updates]
            raise ValueError(f"Missing passwords for: {', '.join(missing)}")

        self._write_auth_file(updates)

    def create_token(self, username: str) -> str:
        secret = ensure_jwt_secret()
        exp = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
        payload = {"sub": username, "exp": exp}
        return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)

    def decode_token(self, token: str) -> Optional[str]:
        try:
            secret = ensure_jwt_secret()
            payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
            username = payload.get("sub")
            if username in FIXED_USERS:
                return username
        except jwt.PyJWTError:
            return None
        return None
