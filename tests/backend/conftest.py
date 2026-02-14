"""Shared test fixtures for the backend tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

FIXTURES_DIR = Path(__file__).parent / "fixtures"


@pytest.fixture
def sample_ruleset_json() -> dict:
    """Load the sample nftables JSON ruleset."""
    with open(FIXTURES_DIR / "sample_ruleset.json") as f:
        return json.load(f)


@pytest.fixture
def sample_ruleset_text() -> str:
    """Load the sample nftables text ruleset."""
    return (FIXTURES_DIR / "sample_ruleset.nft").read_text()
