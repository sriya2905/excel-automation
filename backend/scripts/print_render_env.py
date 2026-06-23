#!/usr/bin/env python3
"""Print environment variables to paste into the Render dashboard."""
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import AUTH_FILE, ENV_HASH_KEYS, FIXED_USERS, load_password_hashes


def main() -> None:
    print("# Copy these into Render → your service → Environment\n")

    print(f"JWT_SECRET_KEY={secrets.token_urlsafe(48)}")
    print("JWT_EXPIRE_HOURS=12")
    print()

    hashes = load_password_hashes()
    if not all(hashes.get(user) for user in FIXED_USERS):
        if AUTH_FILE.is_file():
            print("# Warning: .env.auth exists but not all users have hashes.", file=sys.stderr)
        else:
            print(
                "# No password hashes found. Run setup_auth.py or setup_passwords.py first,\n"
                "# then run this script again.\n",
                file=sys.stderr,
            )
            sys.exit(1)

    for username, env_key in ENV_HASH_KEYS.items():
        print(f"{env_key}={hashes[username]}")

    print("\n# Optional: point your frontend at this API")
    print("# REACT_APP_API_URL=https://YOUR-SERVICE.onrender.com")


if __name__ == "__main__":
    main()
