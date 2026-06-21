"""Read/write key=value pairs in backend/.env without exposing secrets in logs."""
from pathlib import Path
from typing import Dict

from config import ENV_FILE


def write_env_updates(updates: Dict[str, str]) -> None:
    """Merge updates into .env (create file if missing)."""
    env_path = Path(ENV_FILE)
    lines: list[str] = []
    if env_path.is_file():
        lines = env_path.read_text(encoding="utf-8").splitlines()

    remaining = dict(updates)
    out: list[str] = []
    seen: set[str] = set()

    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            out.append(line)
            continue
        key, _ = line.split("=", 1)
        key = key.strip()
        if key in remaining:
            val = remaining.pop(key)
            out.append(f"{key}={val}")
            seen.add(key)
        else:
            out.append(line)

    for key, val in remaining.items():
        if key not in seen:
            out.append(f"{key}={val}")

    env_path.parent.mkdir(parents=True, exist_ok=True)
    text = "\n".join(out)
    if text and not text.endswith("\n"):
        text += "\n"
    env_path.write_text(text, encoding="utf-8")


def read_env_value(key: str) -> str:
    if not ENV_FILE.is_file():
        return ""
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        k, v = stripped.split("=", 1)
        if k.strip() == key:
            return v.strip()
    return ""
