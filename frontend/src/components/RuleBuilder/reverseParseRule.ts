/**
 * Reverse-parses an NftRule.expr[] back into a BuilderState.
 * This enables the "Edit rule" feature by pre-filling the RuleBuilder form.
 */

import type { NftRule, NftStatement } from "../../types/nftables";
import { type BuilderState, INITIAL_STATE } from "./buildRule";

interface ReverseResult {
  state: BuilderState;
  /** true if every expression was fully mapped to form fields */
  isExact: boolean;
}

export function reverseParseRule(rule: NftRule): ReverseResult {
  const state: BuilderState = { ...INITIAL_STATE, comment: rule.comment ?? "" };
  let isExact = true;

  for (const stmt of rule.expr) {
    if (!parseStatement(stmt, state)) {
      isExact = false;
    }
  }

  return { state, isExact };
}

/** Try to map a single statement. Returns false if unrecognized. */
function parseStatement(stmt: NftStatement, state: BuilderState): boolean {
  // ── Match ──
  if ("match" in stmt) {
    return parseMatch(stmt.match, state);
  }

  // ── Counter ──
  if ("counter" in stmt) {
    state.enableCounter = true;
    return true;
  }

  // ── Limit ──
  if ("limit" in stmt) {
    state.enableLimit = true;
    const lim = stmt.limit;
    if (lim && typeof lim === "object") {
      if (typeof lim.rate === "number") state.limitRate = lim.rate;
      if (lim.per) state.limitPer = lim.per;
      if (typeof lim.burst === "number") state.limitBurst = lim.burst;
    }
    return true;
  }

  // ── Log ──
  if ("log" in stmt) {
    state.enableLog = true;
    const log = stmt.log;
    if (log && typeof log === "object") {
      if (log.prefix) state.logPrefix = log.prefix;
      if (log.level) state.logLevel = log.level;
    }
    return true;
  }

  // ── Verdicts ──
  if ("accept" in stmt) { state.action = "accept"; return true; }
  if ("drop" in stmt) { state.action = "drop"; return true; }
  if ("reject" in stmt) { state.action = "reject"; return true; }
  if ("masquerade" in stmt) { state.action = "masquerade"; return true; }

  if ("jump" in stmt) {
    state.action = "jump";
    if (stmt.jump?.target) state.jumpTarget = stmt.jump.target;
    return true;
  }

  if ("dnat" in stmt) {
    state.action = "dnat";
    const dnat = stmt.dnat;
    if (dnat && typeof dnat === "object") {
      if (dnat.addr) state.dnatAddr = String(dnat.addr);
      if (dnat.port != null) state.dnatPort = String(dnat.port);
    }
    return true;
  }

  // Unrecognized statement
  return false;
}

function parseMatch(
  match: { op: string; left: Record<string, unknown>; right: unknown },
  state: BuilderState,
): boolean {
  const left = match.left;
  const right = match.right;

  // ── Payload matches ──
  if (left.payload && typeof left.payload === "object") {
    const payload = left.payload as { protocol?: string; field?: string };
    const proto = payload.protocol;
    const field = payload.field;

    // TCP/UDP port
    if ((proto === "tcp" || proto === "udp") && (field === "dport" || field === "sport")) {
      state.protocol = proto;
      state.portType = field;
      state.port = stringifyPort(right);
      return true;
    }

    // ICMP type
    if ((proto === "icmp" || proto === "icmpv6") && field === "type") {
      state.protocol = proto;
      state.icmpType = String(right);
      return true;
    }

    // Source/dest address
    if ((proto === "ip" || proto === "ip6") && field === "saddr") {
      state.ipVersion = proto;
      state.srcIp = stringifyAddr(right);
      return true;
    }
    if ((proto === "ip" || proto === "ip6") && field === "daddr") {
      state.ipVersion = proto;
      state.dstIp = stringifyAddr(right);
      return true;
    }
  }

  // ── Meta matches ──
  if (left.meta && typeof left.meta === "object") {
    const meta = left.meta as { key?: string };
    if (meta.key === "iifname") {
      state.iif = String(right);
      return true;
    }
    if (meta.key === "oifname") {
      state.oif = String(right);
      return true;
    }
  }

  // ── CT state ──
  if (left.ct && typeof left.ct === "object") {
    const ct = left.ct as { key?: string };
    if (ct.key === "state") {
      state.ctStates = Array.isArray(right) ? right.map(String) : [String(right)];
      return true;
    }
  }

  // Unrecognized match
  return false;
}

function stringifyPort(value: unknown): string {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "set" in value) {
    const set = (value as { set: unknown[] }).set;
    return set.map(String).join(",");
  }
  return String(value);
}

function stringifyAddr(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "prefix" in value) {
    const prefix = (value as { prefix: { addr: string; len: number } }).prefix;
    return `${prefix.addr}/${prefix.len}`;
  }
  return String(value);
}
