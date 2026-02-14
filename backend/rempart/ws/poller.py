"""Background poller for detecting external nftables changes."""

from __future__ import annotations

import asyncio
import hashlib
import json

from ..nft.executor import NftExecutor
from .manager import ConnectionManager


class RulesetPoller:
    """Polls nft list ruleset periodically and broadcasts changes."""

    def __init__(
        self,
        executor: NftExecutor,
        manager: ConnectionManager,
        interval: float = 2.0,
    ):
        self.executor = executor
        self.manager = manager
        self.interval = interval
        self._last_hash: str | None = None
        self._task: asyncio.Task | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._poll_loop())

    def stop(self) -> None:
        if self._task and not self._task.done():
            self._task.cancel()

    async def _poll_loop(self) -> None:
        while True:
            try:
                await asyncio.sleep(self.interval)
                if self.manager.count == 0:
                    continue
                await self._check_for_changes()
            except asyncio.CancelledError:
                break
            except Exception:
                # Don't crash the poller on transient errors
                pass

    async def _check_for_changes(self) -> None:
        try:
            data = await self.executor.list_ruleset_json()
        except Exception:
            return

        raw = json.dumps(data, sort_keys=True)
        current_hash = hashlib.sha256(raw.encode()).hexdigest()

        if self._last_hash is None:
            self._last_hash = current_hash
            return

        if current_hash != self._last_hash:
            self._last_hash = current_hash
            await self.manager.broadcast("ruleset_changed", data)
