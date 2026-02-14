"""Async wrapper around the nft CLI binary.

This is the single point of contact with nftables.
All subprocess calls are centralized here with proper locking
to prevent concurrent nft invocations.
"""

from __future__ import annotations

import asyncio
import json
import tempfile
from pathlib import Path

from ..config import settings


class NftError(Exception):
    """Raised when an nft command fails."""

    def __init__(self, message: str, returncode: int = 1):
        super().__init__(message)
        self.returncode = returncode


class NftExecutor:
    """Thread-safe async wrapper around the nft CLI."""

    def __init__(self, nft_binary: str | None = None):
        self.nft_binary = nft_binary or settings.nft_binary
        self._lock = asyncio.Lock()

    async def _run(
        self,
        *args: str,
        stdin_data: bytes | None = None,
    ) -> tuple[str, str, int]:
        """Execute an nft command with the global lock.

        Returns (stdout, stderr, returncode).
        """
        cmd = [self.nft_binary, *args]
        async with self._lock:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE if stdin_data else None,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate(input=stdin_data)
            return (
                stdout.decode(errors="replace"),
                stderr.decode(errors="replace"),
                proc.returncode or 0,
            )

    async def list_ruleset_json(self) -> dict:
        """Run `nft -j list ruleset` and return parsed JSON."""
        stdout, stderr, rc = await self._run("-j", "list", "ruleset")
        if rc != 0:
            raise NftError(f"nft list ruleset failed: {stderr}", rc)
        return json.loads(stdout)

    async def list_ruleset_text(self) -> str:
        """Run `nft list ruleset` and return text output."""
        stdout, stderr, rc = await self._run("list", "ruleset")
        if rc != 0:
            raise NftError(f"nft list ruleset failed: {stderr}", rc)
        return stdout

    async def validate(self, ruleset_text: str) -> tuple[bool, list[str]]:
        """Validate nft syntax using `nft -c -f /dev/stdin`.

        Returns (is_valid, error_messages).
        """
        stdout, stderr, rc = await self._run(
            "-c", "-f", "/dev/stdin",
            stdin_data=ruleset_text.encode(),
        )
        errors = [line.strip() for line in stderr.splitlines() if line.strip()]
        return rc == 0, errors

    async def apply(self, ruleset_text: str) -> None:
        """Apply a ruleset atomically using `nft -f`.

        The input should typically begin with `flush ruleset`
        for full atomic replacement.
        """
        # Write to a temp file for safer atomic application
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".nft", delete=False
        ) as f:
            f.write(ruleset_text)
            tmppath = f.name

        try:
            stdout, stderr, rc = await self._run("-f", tmppath)
            if rc != 0:
                raise NftError(f"nft apply failed: {stderr}", rc)
        finally:
            Path(tmppath).unlink(missing_ok=True)

    async def save_current(self) -> str:
        """Capture the current ruleset as a restorable text blob.

        Returns `flush ruleset\\n` followed by the full ruleset text.
        """
        text = await self.list_ruleset_text()
        return f"flush ruleset\n{text}"
