"""Session management using signed cookies."""

from __future__ import annotations

import time
from uuid import uuid4

from itsdangerous import BadSignature, URLSafeTimedSerializer

from ..config import settings

_serializer = URLSafeTimedSerializer(settings.secret_key)

# In-memory session store (maps session_id -> creation_time)
_sessions: dict[str, float] = {}


def create_session() -> str:
    """Create a new session and return the signed token."""
    session_id = str(uuid4())
    _sessions[session_id] = time.time()
    return _serializer.dumps(session_id)


def validate_session(token: str) -> bool:
    """Validate a session token. Returns True if valid and not expired."""
    try:
        session_id = _serializer.loads(token, max_age=settings.session_ttl)
    except BadSignature:
        return False

    return session_id in _sessions


def destroy_session(token: str) -> None:
    """Invalidate a session."""
    try:
        session_id = _serializer.loads(token, max_age=settings.session_ttl)
        _sessions.pop(session_id, None)
    except BadSignature:
        pass


def cleanup_expired() -> None:
    """Remove expired sessions from the store."""
    now = time.time()
    expired = [
        sid for sid, created in _sessions.items()
        if now - created > settings.session_ttl
    ]
    for sid in expired:
        del _sessions[sid]
