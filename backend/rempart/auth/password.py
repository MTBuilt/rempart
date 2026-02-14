"""Password hashing and verification using bcrypt directly."""

from __future__ import annotations

import json
from pathlib import Path

import bcrypt

from ..config import settings


def hash_password(password: str) -> str:
    """Hash a password with bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except (ValueError, TypeError):
        return False


def load_password_hash() -> str | None:
    """Load the stored password hash from the auth config file."""
    config_path = Path(settings.resolved_auth_config_path)
    if not config_path.exists():
        return None
    try:
        data = json.loads(config_path.read_text())
        return data.get("password_hash")
    except (json.JSONDecodeError, OSError):
        return None


def save_password_hash(password_hash: str) -> None:
    """Save a password hash to the auth config file."""
    config_path = Path(settings.resolved_auth_config_path)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(json.dumps({"password_hash": password_hash}))
    try:
        config_path.chmod(0o600)
    except OSError:
        pass
