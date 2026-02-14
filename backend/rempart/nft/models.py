"""Pydantic models mirroring the libnftables-json schema.

Reference: https://man.archlinux.org/man/libnftables-json.5.en

These models represent the full nftables ruleset structure as returned
by `nft -j list ruleset`. The hierarchy is:
  NftRuleset (root) -> flat list of NftObject
  Parsed into: RulesetModel -> TableModel[] -> ChainModel[] -> rules[]
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────
# Enums
# ──────────────────────────────────────────────

class NftFamily(str, Enum):
    IP = "ip"
    IP6 = "ip6"
    INET = "inet"
    ARP = "arp"
    BRIDGE = "bridge"
    NETDEV = "netdev"


class ChainType(str, Enum):
    FILTER = "filter"
    NAT = "nat"
    ROUTE = "route"


class ChainPolicy(str, Enum):
    ACCEPT = "accept"
    DROP = "drop"


class SetFlag(str, Enum):
    CONSTANT = "constant"
    INTERVAL = "interval"
    TIMEOUT = "timeout"


class TableFlag(str, Enum):
    DORMANT = "dormant"
    OWNER = "owner"
    PERSIST = "persist"


# ──────────────────────────────────────────────
# Core nftables objects (flat, as returned by nft -j)
# ──────────────────────────────────────────────

class NftMetainfo(BaseModel):
    version: str
    release_name: str
    json_schema_version: int


class NftTable(BaseModel):
    family: NftFamily
    name: str
    handle: int
    flags: list[str] | None = None


class NftChain(BaseModel):
    family: NftFamily
    table: str
    name: str
    handle: int
    # Base chain properties (absent for regular chains)
    type: str | None = None
    hook: str | None = None
    prio: int | None = None
    policy: str | None = None
    dev: str | None = None


class NftRule(BaseModel):
    family: NftFamily
    table: str
    chain: str
    handle: int
    expr: list[dict[str, Any]] = Field(default_factory=list)
    index: int | None = None
    comment: str | None = None


class NftSet(BaseModel):
    family: NftFamily
    table: str
    name: str
    handle: int
    type: str | list[str]
    policy: str | None = None
    flags: list[str] | None = None
    elem: Any | None = None
    timeout: int | None = None
    gc_interval: int | None = Field(None, alias="gc-interval")
    size: int | None = None
    auto_merge: bool | None = Field(None, alias="auto-merge")

    model_config = {"populate_by_name": True}


class NftMap(BaseModel):
    family: NftFamily
    table: str
    name: str
    handle: int
    type: str | list[str]
    map: str
    policy: str | None = None
    flags: list[str] | None = None
    elem: Any | None = None
    size: int | None = None

    model_config = {"populate_by_name": True}


class NftFlowtable(BaseModel):
    family: NftFamily
    table: str
    name: str
    handle: int
    hook: str
    prio: int
    dev: str | list[str]


class NftCounter(BaseModel):
    family: NftFamily
    table: str
    name: str
    handle: int
    packets: int
    bytes: int


class NftQuota(BaseModel):
    family: NftFamily
    table: str
    name: str
    handle: int
    bytes: int
    used: int
    inv: bool | None = None


class NftLimit(BaseModel):
    family: NftFamily
    table: str
    name: str
    handle: int
    rate: int
    per: str
    burst: int | None = None
    unit: str | None = None
    inv: bool | None = None


class NftCtHelper(BaseModel):
    family: NftFamily
    table: str
    name: str
    handle: int
    type: str
    protocol: str
    l3proto: str | None = None


# ──────────────────────────────────────────────
# Hierarchical model (parsed from flat list)
# ──────────────────────────────────────────────

class ChainModel(BaseModel):
    """A chain with its rules."""
    chain: NftChain
    rules: list[NftRule] = Field(default_factory=list)


class TableModel(BaseModel):
    """A table with all its child objects."""
    table: NftTable
    chains: list[ChainModel] = Field(default_factory=list)
    sets: list[NftSet] = Field(default_factory=list)
    maps: list[NftMap] = Field(default_factory=list)
    flowtables: list[NftFlowtable] = Field(default_factory=list)
    counters: list[NftCounter] = Field(default_factory=list)
    quotas: list[NftQuota] = Field(default_factory=list)
    limits: list[NftLimit] = Field(default_factory=list)
    ct_helpers: list[NftCtHelper] = Field(default_factory=list, alias="ctHelpers")

    model_config = {"populate_by_name": True}


class RulesetModel(BaseModel):
    """The full hierarchical ruleset."""
    tables: list[TableModel] = Field(default_factory=list)
