"""Apply & rollback API routes."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..auth.dependencies import get_current_user
from ..nft.executor import NftError
from ..nft.rollback import ApplyState, ConflictError, ValidationError

router = APIRouter()


class ApplyRequest(BaseModel):
    ruleset_text: str
    timeout_seconds: int | None = None


class ApplyResponse(BaseModel):
    apply_id: str
    expires_at: float


class ConfirmRequest(BaseModel):
    apply_id: str


class RevertRequest(BaseModel):
    apply_id: str


class ApplyStatusResponse(BaseModel):
    state: str
    apply_id: str | None = None
    expires_at: float | None = None


@router.post("/apply", response_model=ApplyResponse)
async def apply_ruleset(
    body: ApplyRequest,
    request: Request,
    _: bool = Depends(get_current_user),
):
    """Apply a ruleset with rollback safety.

    The ruleset is validated first. If valid, it's applied atomically.
    A rollback timer starts. If not confirmed within timeout, the
    previous ruleset is restored automatically.
    """
    rollback = request.app.state.rollback
    try:
        apply_id, expires_at = await rollback.apply(
            body.ruleset_text,
            timeout=body.timeout_seconds,
        )
        return ApplyResponse(apply_id=apply_id, expires_at=expires_at)
    except ConflictError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=422, detail={"errors": e.errors})
    except NftError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply/confirm")
async def confirm_apply(
    body: ConfirmRequest,
    request: Request,
    _: bool = Depends(get_current_user),
):
    """Confirm the applied ruleset, cancel the rollback timer."""
    rollback = request.app.state.rollback
    try:
        await rollback.confirm(body.apply_id)
        return {"status": "confirmed"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/apply/revert")
async def revert_apply(
    body: RevertRequest,
    request: Request,
    _: bool = Depends(get_current_user),
):
    """Immediately revert to the pre-apply state."""
    rollback = request.app.state.rollback
    try:
        await rollback.revert(body.apply_id)
        return {"status": "reverted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except NftError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/apply/status", response_model=ApplyStatusResponse)
async def get_apply_status(
    request: Request,
    _: bool = Depends(get_current_user),
):
    """Get the current apply/rollback state."""
    rollback = request.app.state.rollback
    status = rollback.get_status()
    return ApplyStatusResponse(**status)
