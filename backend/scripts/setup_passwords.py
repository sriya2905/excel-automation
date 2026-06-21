#!/usr/bin/env python3
"""One-time interactive password setup — writes bcrypt hashes to backend/.env."""
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from config import ENV_FILE, FIXED_USERS
from services.auth_service import AuthService


def main() -> None:
    auth = AuthService()
    force = "--force" in sys.argv or "-f" in sys.argv
    if auth.is_configured() and not force:
        print("Passwords are already configured.")
        print(f"To reset, run: python scripts/setup_passwords.py --force")
        print(f"Or delete PASSWORD_HASH_* lines in: {ENV_FILE}")
        sys.exit(0)

    print("Material Test Report Generator — password setup")
    print("Enter a password for each user (input hidden).\n")
    passwords = {}
    for username in FIXED_USERS:
        while True:
            p1 = getpass.getpass(f"Password for {username}: ")
            p2 = getpass.getpass(f"Confirm password for {username}: ")
            if p1 != p2:
                print("Passwords do not match. Try again.\n")
                continue
            if len(p1) < 4:
                print("Password must be at least 4 characters.\n")
                continue
            passwords[username] = p1
            break

    auth.setup_passwords(passwords)
    print(f"\nSuccess. Bcrypt hashes saved in {ENV_FILE}")
    print("Start the API (python app.py), then open the frontend and log in.")


if __name__ == "__main__":
    main()
