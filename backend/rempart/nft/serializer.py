"""Serialize a RulesetModel into nft text syntax.

Produces human-readable nftables configuration that can be loaded
with `nft -f`. The output starts with `flush ruleset` for atomic
replacement.
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
    RulesetModel,
    TableModel,
)


def serialize_ruleset(model: RulesetModel, flush: bool = True) -> str:
    """Serialize a RulesetModel to nft text syntax.

    Args:
        model: The hierarchical ruleset model.
        flush: Whether to prepend `flush ruleset`.

    Returns:
        A string of valid nft syntax.
    """
    lines: list[str] = []
    if flush:
        lines.append("flush ruleset")
        lines.append("")

    for tm in model.tables:
        lines.extend(_serialize_table(tm))
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def _serialize_table(tm: TableModel) -> list[str]:
    t = tm.table
    flags_str = ""
    if t.flags:
        flags_str = f"\n\tflags {', '.join(t.flags)}"

    lines = [f"table {t.family.value} {t.name} {{{flags_str}"]

    # Named counters
    for counter in tm.counters:
        lines.extend(_serialize_named_counter(counter))

    # Named quotas
    for quota in tm.quotas:
        lines.extend(_serialize_named_quota(quota))

    # Named limits
    for limit in tm.limits:
        lines.extend(_serialize_named_limit(limit))

    # CT helpers
    for cth in tm.ct_helpers:
        lines.extend(_serialize_ct_helper(cth))

    # Sets
    for s in tm.sets:
        lines.extend(_serialize_set(s))

    # Maps
    for m in tm.maps:
        lines.extend(_serialize_map(m))

    # Flowtables
    for ft in tm.flowtables:
        lines.extend(_serialize_flowtable(ft))

    # Chains
    for cm in tm.chains:
        lines.extend(_serialize_chain(cm))

    lines.append("}")
    return lines


def _serialize_chain(cm: ChainModel) -> list[str]:
    c = cm.chain
    lines = [f"\tchain {c.name} {{"]

    # Base chain properties
    if c.type and c.hook is not None:
        prio = c.prio if c.prio is not None else 0
        policy = f" policy {c.policy};" if c.policy else ""
        dev = f" devices = {{ {c.dev} }};" if c.dev else ""
        lines.append(f"\t\ttype {c.type} hook {c.hook} priority {prio};{policy}{dev}")

    for rule in cm.rules:
        lines.append(f"\t\t{_serialize_rule(rule)}")

    lines.append("\t}")
    return lines


def _serialize_rule(rule: NftRule) -> str:
    parts: list[str] = []

    for stmt in rule.expr:
        parts.append(_serialize_statement(stmt))

    result = " ".join(parts)
    if rule.comment:
        result += f' comment "{rule.comment}"'
    return result


def _serialize_statement(stmt: dict[str, Any]) -> str:
    if "match" in stmt:
        return _serialize_match(stmt["match"])
    if "accept" in stmt:
        return "accept"
    if "drop" in stmt:
        return "drop"
    if "return" in stmt:
        return "return"
    if "continue" in stmt:
        return "continue"
    if "jump" in stmt:
        return f"jump {stmt['jump']['target']}"
    if "goto" in stmt:
        return f"goto {stmt['goto']['target']}"
    if "counter" in stmt:
        return _serialize_counter_stmt(stmt["counter"])
    if "log" in stmt:
        return _serialize_log(stmt["log"])
    if "reject" in stmt:
        return _serialize_reject(stmt["reject"])
    if "limit" in stmt:
        return _serialize_limit_stmt(stmt["limit"])
    if "masquerade" in stmt:
        return _serialize_masquerade(stmt["masquerade"])
    if "snat" in stmt:
        return _serialize_nat("snat", stmt["snat"])
    if "dnat" in stmt:
        return _serialize_nat("dnat", stmt["dnat"])
    if "redirect" in stmt:
        return _serialize_redirect(stmt["redirect"])
    if "notrack" in stmt:
        return "notrack"
    if "queue" in stmt:
        return _serialize_queue(stmt["queue"])
    if "mangle" in stmt:
        return _serialize_mangle(stmt["mangle"])
    # Fallback: try to represent as key-value
    for key, val in stmt.items():
        return f"{key} {_serialize_expr(val)}" if val else key
    return ""


def _serialize_match(match: dict[str, Any]) -> str:
    left = _serialize_expr(match["left"])
    right = _serialize_expr(match["right"])
    op = match.get("op", "==")

    # nft syntax uses implicit == (no operator shown)
    if op == "==":
        return f"{left} {right}"
    if op == "!=":
        return f"{left} != {right}"
    return f"{left} {op} {right}"


def _serialize_expr(expr: Any) -> str:
    if expr is None:
        return ""
    if isinstance(expr, bool):
        return str(expr).lower()
    if isinstance(expr, (int, float)):
        return str(expr)
    if isinstance(expr, str):
        return expr
    if isinstance(expr, list):
        # List of values -> set syntax or just space-separated
        if len(expr) == 0:
            return "{}"
        items = [_serialize_expr(e) for e in expr]
        return "{ " + ", ".join(items) + " }"
    if isinstance(expr, dict):
        return _serialize_expr_dict(expr)
    return str(expr)


def _serialize_expr_dict(expr: dict[str, Any]) -> str:
    if "payload" in expr:
        p = expr["payload"]
        proto = p.get("protocol", "")
        field = p.get("field", "")
        if proto and field:
            return f"{proto} {field}"
        if p.get("base"):
            return f"@{p['base']},{p.get('offset', 0)},{p.get('len', 0)}"
        return f"{proto} {field}".strip()

    if "meta" in expr:
        return f"meta {expr['meta']['key']}"

    if "ct" in expr:
        ct = expr["ct"]
        parts = ["ct"]
        if ct.get("dir"):
            parts.append(ct["dir"])
        parts.append(ct["key"])
        return " ".join(parts)

    if "prefix" in expr:
        p = expr["prefix"]
        return f"{_serialize_expr(p['addr'])}/{p['len']}"

    if "range" in expr:
        r = expr["range"]
        return f"{_serialize_expr(r[0])}-{_serialize_expr(r[1])}"

    if "set" in expr:
        val = expr["set"]
        if isinstance(val, list):
            items = [_serialize_expr(e) for e in val]
            return "{ " + ", ".join(items) + " }"
        return "{ " + _serialize_expr(val) + " }"

    if "concat" in expr:
        items = [_serialize_expr(e) for e in expr["concat"]]
        return " . ".join(items)

    if "map" in expr:
        m = expr["map"]
        return f"{_serialize_expr(m['key'])} map {_serialize_expr(m['data'])}"

    if "numgen" in expr:
        ng = expr["numgen"]
        return f"numgen {ng.get('mode', 'inc')} mod {ng.get('mod', 0)}"

    if "fib" in expr:
        f = expr["fib"]
        flags = " . ".join(f.get("flags", []))
        return f"fib {flags} {f.get('result', '')}"

    if "socket" in expr:
        return f"socket {expr['socket']['key']}"

    if "osf" in expr:
        return f"osf {expr['osf']['key']}"

    if "rt" in expr:
        return f"rt {expr['rt']['key']}"

    # Bitwise operations
    for op_char in ["|", "^", "&", "<<", ">>"]:
        if op_char in expr:
            items = [_serialize_expr(e) for e in expr[op_char]]
            return f" {op_char} ".join(items)

    # Fallback
    for key, val in expr.items():
        if val is None:
            return key
        return f"{key} {_serialize_expr(val)}"
    return ""


def _serialize_counter_stmt(counter: Any) -> str:
    if isinstance(counter, str):
        return f"counter name {counter}"
    if isinstance(counter, dict):
        return "counter"
    return "counter"


def _serialize_log(log: dict[str, Any]) -> str:
    parts = ["log"]
    if log.get("prefix"):
        parts.append(f'prefix "{log["prefix"]}"')
    if log.get("level"):
        parts.append(f"level {log['level']}")
    if log.get("group"):
        parts.append(f"group {log['group']}")
    return " ".join(parts)


def _serialize_reject(reject: dict[str, Any]) -> str:
    if not reject:
        return "reject"
    parts = ["reject"]
    if reject.get("type"):
        parts.append(f"with {reject['type']}")
    if reject.get("expr"):
        parts.append(_serialize_expr(reject["expr"]))
    return " ".join(parts)


def _serialize_limit_stmt(limit: Any) -> str:
    if isinstance(limit, str):
        return f"limit name {limit}"
    if isinstance(limit, dict):
        rate = limit.get("rate", 0)
        per = limit.get("per", "second")
        burst = limit.get("burst")
        unit = limit.get("unit", "packets")
        parts = [f"limit rate {rate}/{per}"]
        if burst:
            parts.append(f"burst {burst} {unit}")
        return " ".join(parts)
    return "limit"


def _serialize_masquerade(masq: Any) -> str:
    if masq is None:
        return "masquerade"
    if isinstance(masq, dict):
        parts = ["masquerade"]
        if masq.get("port"):
            parts.append(f"to :{_serialize_expr(masq['port'])}")
        return " ".join(parts)
    return "masquerade"


def _serialize_nat(kind: str, nat: dict[str, Any]) -> str:
    parts = [kind, "to"]
    if nat.get("addr"):
        parts.append(_serialize_expr(nat["addr"]))
    if nat.get("port"):
        parts.append(f":{_serialize_expr(nat['port'])}")
    return " ".join(parts)


def _serialize_redirect(redirect: dict[str, Any]) -> str:
    if not redirect:
        return "redirect"
    parts = ["redirect", "to"]
    if redirect.get("port"):
        parts.append(f":{_serialize_expr(redirect['port'])}")
    return " ".join(parts)


def _serialize_queue(queue: dict[str, Any]) -> str:
    parts = ["queue"]
    if queue.get("num"):
        parts.append(f"num {_serialize_expr(queue['num'])}")
    if queue.get("flags"):
        parts.append(f"flags {','.join(queue['flags'])}")
    return " ".join(parts)


def _serialize_mangle(mangle: dict[str, Any]) -> str:
    key = _serialize_expr(mangle["key"])
    val = _serialize_expr(mangle["value"])
    return f"{key} set {val}"


def _serialize_set(s: NftSet) -> list[str]:
    type_str = " . ".join(s.type) if isinstance(s.type, list) else s.type
    lines = [f"\tset {s.name} {{"]
    lines.append(f"\t\ttype {type_str}")

    if s.flags:
        lines.append(f"\t\tflags {', '.join(s.flags)}")
    if s.timeout is not None:
        lines.append(f"\t\ttimeout {s.timeout}s")
    if s.size is not None:
        lines.append(f"\t\tsize {s.size}")
    if s.auto_merge:
        lines.append("\t\tauto-merge")

    if s.elem:
        elems = s.elem if isinstance(s.elem, list) else [s.elem]
        elem_strs = [_serialize_expr(e) for e in elems]
        lines.append(f"\t\telements = {{ {', '.join(elem_strs)} }}")

    lines.append("\t}")
    return lines


def _serialize_map(m: NftMap) -> list[str]:
    type_str = " . ".join(m.type) if isinstance(m.type, list) else m.type
    lines = [f"\tmap {m.name} {{"]
    lines.append(f"\t\ttype {type_str} : {m.map}")

    if m.flags:
        lines.append(f"\t\tflags {', '.join(m.flags)}")
    if m.size is not None:
        lines.append(f"\t\tsize {m.size}")

    if m.elem:
        elems = m.elem if isinstance(m.elem, list) else [m.elem]
        elem_strs = [_serialize_expr(e) for e in elems]
        lines.append(f"\t\telements = {{ {', '.join(elem_strs)} }}")

    lines.append("\t}")
    return lines


def _serialize_flowtable(ft: NftFlowtable) -> list[str]:
    devs = ft.dev if isinstance(ft.dev, list) else [ft.dev]
    dev_str = ", ".join(devs)
    lines = [f"\tflowtable {ft.name} {{"]
    lines.append(f"\t\thook {ft.hook} priority {ft.prio}")
    lines.append(f"\t\tdevices = {{ {dev_str} }}")
    lines.append("\t}")
    return lines


def _serialize_named_counter(c: NftCounter) -> list[str]:
    return [
        f"\tcounter {c.name} {{",
        f"\t\tpackets {c.packets} bytes {c.bytes}",
        "\t}",
    ]


def _serialize_named_quota(q: NftQuota) -> list[str]:
    inv = " inv" if q.inv else ""
    return [
        f"\tquota {q.name} {{",
        f"\t\t{q.bytes} used {q.used}{inv}",
        "\t}",
    ]


def _serialize_named_limit(lim: NftLimit) -> list[str]:
    burst = f" burst {lim.burst}" if lim.burst else ""
    return [
        f"\tlimit {lim.name} {{",
        f"\t\trate {lim.rate}/{lim.per}{burst}",
        "\t}",
    ]


def _serialize_ct_helper(cth: NftCtHelper) -> list[str]:
    lines = [
        f'\tct helper {cth.name} {{',
        f"\t\ttype \"{cth.type}\" protocol {cth.protocol}",
    ]
    if cth.l3proto:
        lines.append(f"\t\tl3proto {cth.l3proto}")
    lines.append("\t}")
    return lines
