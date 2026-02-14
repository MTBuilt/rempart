"""Apply-with-rollback state machine.

Safety-critical module that prevents SSH lockout when applying
firewall rules. The flow is:
  1. Save current ruleset as backup
  2. Validate proposed ruleset
  3. Apply atomically
  4. Start a rollback timer
  5. If user confirms before timeout: keep new rules
  6. If timer expires: automatically restore backup
"""

from __future__ import annotations

import asyncio
from enum import Enum
from typing import Callable
from uuid import uuid4

from .executor import NftError, NftExecutor


class ApplyState(str, Enum):
    IDLE = "idle"
    PENDING_CONFIRMATION = "pending_confirmation"
    REVERTING = "reverting"


class ConflictError(Exception):
    """Raised when trying to apply while another apply is pending."""


class ValidationError(Exception):
    """Raised when the proposed ruleset fails validation."""

    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__(f"Validation failed: {'; '.join(errors)}")


class RollbackManager:
    """Manages the apply → confirm/revert lifecycle."""

    def __init__(
        self,
        executor: NftExecutor,
        default_timeout: int = 30,
        on_state_change: Callable[[ApplyState, str | None], None] | None = None,
    ):
        self.executor = executor
        self.default_timeout = default_timeout
        self.on_state_change = on_state_change

        self.state = ApplyState.IDLE
        self.apply_id: str | None = None
        self.backup: str | None = None
        self.expires_at: float | None = None
        self._timer_task: asyncio.Task | None = None

    def _notify(self) -> None:
        if self.on_state_change:
            self.on_state_change(self.state, self.apply_id)

    async def apply(
        self,
        ruleset_text: str,
        timeout: int | None = None,
    ) -> tuple[str, float]:
        """Apply a ruleset with rollback safety.

        Args:
            ruleset_text: The nft syntax to apply (should start with `flush ruleset`).
            timeout: Seconds before automatic rollback. Defaults to default_timeout.

        Returns:
            Tuple of (apply_id, expires_at_timestamp).

        Raises:
            ConflictError: If another apply is already pending.
            ValidationError: If the ruleset fails `nft -c -f` validation.
            NftError: If the apply itself fails.
        """
        if self.state != ApplyState.IDLE:
            raise ConflictError("Another apply operation is pending confirmation")

        # 1. Save current state
        self.backup = await self.executor.save_current()

        # 2. Validate
        valid, errors = await self.executor.validate(ruleset_text)
        if not valid:
            self.backup = None
            raise ValidationError(errors)

        # 3. Apply
        try:
            await self.executor.apply(ruleset_text)
        except NftError:
            # Apply failed, restore backup
            if self.backup:
                try:
                    await self.executor.apply(self.backup)
                except NftError:
                    pass  # If even restore fails, we're in trouble
            self.backup = None
            raise

        # 4. Start timer
        timeout_secs = timeout or self.default_timeout
        self.apply_id = str(uuid4())
        self.state = ApplyState.PENDING_CONFIRMATION

        loop = asyncio.get_event_loop()
        self.expires_at = loop.time() + timeout_secs
        self._timer_task = asyncio.create_task(
            self._rollback_timer(timeout_secs)
        )
        self._notify()

        return self.apply_id, self.expires_at

    async def confirm(self, apply_id: str) -> None:
        """Confirm the applied ruleset, cancel the rollback timer.

        Args:
            apply_id: Must match the ID returned by apply().

        Raises:
            ValueError: If apply_id doesn't match or no apply is pending.
        """
        if self.state != ApplyState.PENDING_CONFIRMATION:
            raise ValueError("No apply pending confirmation")
        if self.apply_id != apply_id:
            raise ValueError("Invalid apply_id")

        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
            try:
                await self._timer_task
            except asyncio.CancelledError:
                pass

        self._reset()
        self._notify()

    async def revert(self, apply_id: str) -> None:
        """Immediately revert to the pre-apply state.

        Args:
            apply_id: Must match the ID returned by apply().
        """
        if self.state != ApplyState.PENDING_CONFIRMATION:
            raise ValueError("No apply pending confirmation")
        if self.apply_id != apply_id:
            raise ValueError("Invalid apply_id")

        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
            try:
                await self._timer_task
            except asyncio.CancelledError:
                pass

        await self._do_revert()

    async def _rollback_timer(self, seconds: int) -> None:
        """Background task: wait, then revert if not confirmed."""
        try:
            await asyncio.sleep(seconds)
            await self._do_revert()
        except asyncio.CancelledError:
            pass

    async def _do_revert(self) -> None:
        """Restore the backup ruleset."""
        self.state = ApplyState.REVERTING
        self._notify()

        if self.backup:
            try:
                await self.executor.apply(self.backup)
            except NftError as e:
                # Log this but don't crash - the backup itself shouldn't fail
                self._reset()
                self._notify()
                raise NftError(f"Rollback failed: {e}") from e

        self._reset()
        self._notify()

    def _reset(self) -> None:
        """Reset to idle state."""
        self.state = ApplyState.IDLE
        self.apply_id = None
        self.backup = None
        self.expires_at = None
        self._timer_task = None

    def get_status(self) -> dict:
        """Return the current apply state as a dict."""
        return {
            "state": self.state.value,
            "apply_id": self.apply_id,
            "expires_at": self.expires_at,
        }
