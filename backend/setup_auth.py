import bcrypt
import json
from pathlib import Path


users_passwords = {
    "Mahesh Chavan": "synergymcqa",
    "Rahul Karape": "synergyrkqa",
    "Digember": "synergydqa",
    "Q/A Lab": "synergyqa",
}


def main() -> None:
    auth_file = Path(__file__).resolve().parent / ".env.auth"
    credentials = {}

    print("=== SETTING UP AUTHENTICATION ===\n")
    for user, password in users_passwords.items():
        hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
        credentials[user] = hashed
        print(f"Password configured for {user}")

    config = {"users": credentials, "configured": True}
    with auth_file.open("w", encoding="utf-8") as file_handle:
        json.dump(config, file_handle, indent=2)

    print("\nAuthentication setup complete!")
    print("All 4 users configured")
    print("You can now login")


if __name__ == "__main__":
    main()
