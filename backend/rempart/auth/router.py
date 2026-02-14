"""Authentication API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel

from .dependencies import get_current_user
from .password import load_password_hash, save_password_hash, hash_password, verify_password
from .session import create_session, destroy_session

router = APIRouter()


class LoginRequest(BaseModel):
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login")
async def login(body: LoginRequest, response: Response):
    """Authenticate with password and set session cookie."""
    stored_hash = load_password_hash()

    if stored_hash is None:
        # First run: set this as the initial password
        new_hash = hash_password(body.password)
        save_password_hash(new_hash)
        token = create_session()
        response.set_cookie(
            key="session",
            value=token,
            httponly=True,
            samesite="strict",
            secure=False,  # Set to True when using HTTPS
        )
        return {"status": "ok", "message": "Initial password set"}

    if not verify_password(body.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )

    token = create_session()
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        samesite="strict",
        secure=False,
    )
    return {"status": "ok"}


@router.post("/logout")
async def logout(
    response: Response,
    session: str | None = None,
):
    """Clear the session."""
    if session:
        destroy_session(session)
    response.delete_cookie("session")
    return {"status": "ok"}


@router.get("/me")
async def me(_: bool = Depends(get_current_user)):
    """Check if the current session is valid."""
    return {"authenticated": True}


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    _: bool = Depends(get_current_user),
):
    """Change the admin password."""
    stored_hash = load_password_hash()
    if stored_hash is None or not verify_password(body.current_password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    new_hash = hash_password(body.new_password)
    save_password_hash(new_hash)
    return {"status": "ok"}
