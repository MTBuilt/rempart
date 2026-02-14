"""Parse flat nftables JSON into hierarchical RulesetModel.

Takes the output of `nft -j list ruleset` (a flat list of objects)
and organizes it into a tree: tables → chains → rules, with sets,
maps, counters, etc. grouped under their parent table.
"""

from __future__ import annotations

from typing import Any

from .models import (
    ChainModel,
    NftChain,
    NftCounter,
    NftCtHelper,
    NftFlowtable,
    NftLimit,
    NftMap,
    NftQuota,
    NftRule,
    NftSet,
    NftTable,
    RulesetModel,
    TableModel,
)


def _table_key(family: str, name: str) -> str:
    return f"{family}:{name}"


def parse_ruleset_json(data: dict[str, Any]) -> RulesetModel:
    """Parse the raw JSON from `nft -j list ruleset` into a RulesetModel.

    Args:
        data: The raw JSON dict with a "nftables" key containing a list of objects.

    Returns:
        A hierarchical RulesetModel.
    """
    objects = data.get("nftables", [])

    # Index tables by family:name for fast lookup
    tables: dict[str, TableModel] = {}
    table_order: list[str] = []

    # Index chains by family:table:chain for rule assignment
    chains: dict[str, ChainModel] = {}

    for obj in objects:
        if "metainfo" in obj:
            continue

        if "table" in obj:
            t = NftTable.model_validate(obj["table"])
            key = _table_key(t.family.value, t.name)
            if key not in tables:
                tables[key] = TableModel(table=t)
                table_order.append(key)

        elif "chain" in obj:
            c = NftChain.model_validate(obj["chain"])
            tkey = _table_key(c.family.value, c.table)
            table_model = tables.get(tkey)
            if table_model is None:
                continue
            cm = ChainModel(chain=c)
            table_model.chains.append(cm)
            ckey = f"{c.family.value}:{c.table}:{c.name}"
            chains[ckey] = cm

        elif "rule" in obj:
            r = NftRule.model_validate(obj["rule"])
            ckey = f"{r.family.value}:{r.table}:{r.chain}"
            chain_model = chains.get(ckey)
            if chain_model is None:
                continue
            chain_model.rules.append(r)

        elif "set" in obj:
            s = NftSet.model_validate(obj["set"])
            tkey = _table_key(s.family.value, s.table)
            table_model = tables.get(tkey)
            if table_model is not None:
                table_model.sets.append(s)

        elif "map" in obj:
            m = NftMap.model_validate(obj["map"])
            tkey = _table_key(m.family.value, m.table)
            table_model = tables.get(tkey)
            if table_model is not None:
                table_model.maps.append(m)

        elif "flowtable" in obj:
            ft = NftFlowtable.model_validate(obj["flowtable"])
            tkey = _table_key(ft.family.value, ft.table)
            table_model = tables.get(tkey)
            if table_model is not None:
                table_model.flowtables.append(ft)

        elif "counter" in obj:
            ct = NftCounter.model_validate(obj["counter"])
            tkey = _table_key(ct.family.value, ct.table)
            table_model = tables.get(tkey)
            if table_model is not None:
                table_model.counters.append(ct)

        elif "quota" in obj:
            q = NftQuota.model_validate(obj["quota"])
            tkey = _table_key(q.family.value, q.table)
            table_model = tables.get(tkey)
            if table_model is not None:
                table_model.quotas.append(q)

        elif "limit" in obj:
            lim = NftLimit.model_validate(obj["limit"])
            tkey = _table_key(lim.family.value, lim.table)
            table_model = tables.get(tkey)
            if table_model is not None:
                table_model.limits.append(lim)

        elif "ct helper" in obj:
            cth = NftCtHelper.model_validate(obj["ct helper"])
            tkey = _table_key(cth.family.value, cth.table)
            table_model = tables.get(tkey)
            if table_model is not None:
                table_model.ct_helpers.append(cth)

    # Preserve insertion order
    ordered_tables = [tables[k] for k in table_order]
    return RulesetModel(tables=ordered_tables)
