"""FastAPI dependencies for authentication."""

from __future__ import annotations

from fastapi import Cookie, HTTPException, status

from .session import validate_session


async def get_current_user(session: str | None = Cookie(default=None)) -> bool:
    """Dependency that requires a valid session cookie.

    Returns True if authenticated. Raises 401 otherwise.
    """
    if session is None or not validate_session(session):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return True
