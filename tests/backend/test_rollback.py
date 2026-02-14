"""Tests for the rollback state machine."""

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from rempart.nft.rollback import (
    ApplyState,
    ConflictError,
    RollbackManager,
    ValidationError,
)

pytestmark = pytest.mark.asyncio


@pytest.fixture
def mock_executor():
    executor = MagicMock()
    executor.save_current = AsyncMock(return_value="flush ruleset\n# backup")
    executor.validate = AsyncMock(return_value=(True, []))
    executor.apply = AsyncMock()
    return executor


@pytest.fixture
def rollback(mock_executor):
    return RollbackManager(mock_executor, default_timeout=2)


async def test_apply_returns_id(rollback):
    apply_id, expires = await rollback.apply("flush ruleset\n# new rules")
    assert apply_id is not None
    assert expires > 0
    assert rollback.state == ApplyState.PENDING_CONFIRMATION


async def test_apply_calls_executor(rollback, mock_executor):
    await rollback.apply("flush ruleset\n# new rules")

    mock_executor.save_current.assert_called_once()
    mock_executor.validate.assert_called_once_with("flush ruleset\n# new rules")
    mock_executor.apply.assert_called_once_with("flush ruleset\n# new rules")


async def test_confirm_resets_state(rollback):
    apply_id, _ = await rollback.apply("flush ruleset\n# new rules")
    await rollback.confirm(apply_id)

    assert rollback.state == ApplyState.IDLE
    assert rollback.apply_id is None
    assert rollback.backup is None


async def test_confirm_wrong_id_raises(rollback):
    await rollback.apply("flush ruleset\n# new rules")

    with pytest.raises(ValueError, match="Invalid apply_id"):
        await rollback.confirm("wrong-id")


async def test_revert_restores_backup(rollback, mock_executor):
    apply_id, _ = await rollback.apply("flush ruleset\n# new rules")
    mock_executor.apply.reset_mock()

    await rollback.revert(apply_id)

    # Should have applied the backup
    mock_executor.apply.assert_called_once_with("flush ruleset\n# backup")
    assert rollback.state == ApplyState.IDLE


async def test_auto_revert_on_timeout(rollback, mock_executor):
    rollback.default_timeout = 1  # 1 second timeout
    await rollback.apply("flush ruleset\n# new rules")
    mock_executor.apply.reset_mock()

    # Wait for timeout
    await asyncio.sleep(1.5)

    # Should have auto-reverted
    mock_executor.apply.assert_called_once_with("flush ruleset\n# backup")
    assert rollback.state == ApplyState.IDLE


async def test_conflict_error_on_double_apply(rollback):
    await rollback.apply("flush ruleset\n# first")

    with pytest.raises(ConflictError):
        await rollback.apply("flush ruleset\n# second")


async def test_validation_error(rollback, mock_executor):
    mock_executor.validate = AsyncMock(
        return_value=(False, ["Error at line 3: syntax error"])
    )

    with pytest.raises(ValidationError) as exc_info:
        await rollback.apply("bad syntax")

    assert "syntax error" in str(exc_info.value)
    assert rollback.state == ApplyState.IDLE


async def test_state_change_callback(mock_executor):
    states = []

    def on_change(state, apply_id):
        states.append(state)

    mgr = RollbackManager(mock_executor, default_timeout=2, on_state_change=on_change)
    apply_id, _ = await mgr.apply("flush ruleset\n# rules")
    await mgr.confirm(apply_id)

    assert ApplyState.PENDING_CONFIRMATION in states
    assert ApplyState.IDLE in states
