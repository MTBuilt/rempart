"""Ruleset API routes - read, parse, validate."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from ..auth.dependencies import get_current_user
from ..nft.executor import NftError
from ..nft.parser import parse_ruleset_json

router = APIRouter()


class ParseRequest(BaseModel):
    text: str


class ParseResponse(BaseModel):
    valid: bool
    model: dict | None = None
    errors: list[str] = []


class ValidateRequest(BaseModel):
    text: str


class ValidateResponse(BaseModel):
    valid: bool
    errors: list[str] = []


@router.get("/ruleset")
async def get_ruleset(request: Request, _: bool = Depends(get_current_user)):
    """Get the current ruleset as structured JSON."""
    executor = request.app.state.executor
    try:
        raw_json = await executor.list_ruleset_json()
        model = parse_ruleset_json(raw_json)
        return {
            "model": model.model_dump(by_alias=True),
            "raw": raw_json,
        }
    except NftError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ruleset/text")
async def get_ruleset_text(request: Request, _: bool = Depends(get_current_user)):
    """Get the current ruleset as nft text syntax."""
    executor = request.app.state.executor
    try:
        text = await executor.list_ruleset_text()
        return {"text": text}
    except NftError as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ruleset/parse", response_model=ParseResponse)
async def parse_ruleset_text(
    body: ParseRequest,
    request: Request,
    _: bool = Depends(get_current_user),
):
    """Validate nft text syntax.

    Used for the code-to-tree sync: validates syntax in real-time
    via `nft -c -f`. The visual tree updates after the user
    explicitly applies — the WebSocket poller detects the change
    and broadcasts it to all connected clients.
    """
    executor = request.app.state.executor
    valid, errors = await executor.validate(body.text)
    if not valid:
        return ParseResponse(valid=False, errors=errors)

    return ParseResponse(valid=True, errors=[])


@router.post("/ruleset/validate", response_model=ValidateResponse)
async def validate_ruleset(
    body: ValidateRequest,
    request: Request,
    _: bool = Depends(get_current_user),
):
    """Validate nft text syntax without applying."""
    executor = request.app.state.executor
    valid, errors = await executor.validate(body.text)
    return ValidateResponse(valid=valid, errors=errors)
