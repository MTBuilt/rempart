/**
 * Translate nftables rules into human-readable descriptions.
 * Makes nftables accessible to non-experts.
 */

import type { NftRule, NftChain, NftSet, NftStatement } from "../types/nftables";

/** Describe what a rule does in plain language */
export function humanizeRule(rule: NftRule): string {
  const conditions = getConditions(rule.expr);
  const action = getAction(rule.expr);

  if (conditions.length === 0) {
    return action;
  }
  return `${conditions.join(" et ")} → ${action}`;
}

/** Short label for a rule's action */
export function getVerdictLabel(expr: NftStatement[]): {
  text: string;
  color: string;
  bg: string;
  icon: "accept" | "drop" | "reject" | "jump" | "nat" | "log" | "other";
} {
  for (let i = expr.length - 1; i >= 0; i--) {
    const s = expr[i];
    if ("accept" in s) return { text: "Accepter", color: "#22c55e", bg: "#052e16", icon: "accept" };
    if ("drop" in s) return { text: "Bloquer", color: "#ef4444", bg: "#450a0a", icon: "drop" };
    if ("reject" in s) return { text: "Rejeter", color: "#f97316", bg: "#431407", icon: "reject" };
    if ("jump" in s) return { text: `→ ${s.jump.target}`, color: "#3b82f6", bg: "#172554", icon: "jump" };
    if ("goto" in s) return { text: `→ ${s.goto.target}`, color: "#3b82f6", bg: "#172554", icon: "jump" };
    if ("masquerade" in s) return { text: "NAT (masquerade)", color: "#a78bfa", bg: "#2e1065", icon: "nat" };
    if ("snat" in s) return { text: "SNAT", color: "#a78bfa", bg: "#2e1065", icon: "nat" };
    if ("dnat" in s) return { text: `DNAT → ${formatNat(s.dnat)}`, color: "#a78bfa", bg: "#2e1065", icon: "nat" };
    if ("redirect" in s) return { text: "Redirect", color: "#a78bfa", bg: "#2e1065", icon: "nat" };
  }
  return { text: "Continuer", color: "#94a3b8", bg: "#1e293b", icon: "other" };
}

/** Human-readable chain description */
export function humanizeChain(chain: NftChain): string {
  if (!chain.type) return "Chaîne personnalisée";

  const hookLabels: Record<string, string> = {
    input: "Trafic entrant",
    output: "Trafic sortant",
    forward: "Trafic transféré",
    prerouting: "Avant routage",
    postrouting: "Après routage",
    ingress: "Entrée interface",
    egress: "Sortie interface",
  };

  const hook = hookLabels[chain.hook ?? ""] ?? chain.hook ?? "";
  return hook;
}

/** Human-readable chain policy */
export function humanizePolicy(policy: string | undefined): {
  text: string;
  color: string;
  description: string;
} {
  if (policy === "accept") {
    return {
      text: "Tout autoriser par défaut",
      color: "#22c55e",
      description: "Ce qui n'est pas explicitement bloqué est autorisé",
    };
  }
  if (policy === "drop") {
    return {
      text: "Tout bloquer par défaut",
      color: "#ef4444",
      description: "Ce qui n'est pas explicitement autorisé est bloqué",
    };
  }
  return { text: "Aucune", color: "#94a3b8", description: "" };
}

/** Human-readable set description */
export function humanizeSet(set: NftSet): string {
  const count = Array.isArray(set.elem) ? set.elem.length : set.elem ? 1 : 0;
  const typeLabel = set.type === "ipv4_addr" ? "adresses IPv4"
    : set.type === "ipv6_addr" ? "adresses IPv6"
    : set.type === "inet_service" ? "ports"
    : set.type === "ether_addr" ? "adresses MAC"
    : `éléments (${set.type})`;

  const parts = [`${count} ${typeLabel}`];
  if (set.timeout) parts.push(`expire après ${formatDuration(set.timeout)}`);
  if (set.flags?.includes("interval")) parts.push("plages");
  return parts.join(" · ");
}

/** Format bytes into human-readable */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Format packet count */
export function formatPackets(packets: number): string {
  if (packets < 1000) return `${packets}`;
  if (packets < 1_000_000) return `${(packets / 1000).toFixed(1)}K`;
  return `${(packets / 1_000_000).toFixed(1)}M`;
}

/** Format duration in seconds */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}j`;
}

// ── Internal helpers ──────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getConditions(expr: any[]): string[] {
  const parts: string[] = [];
  for (const s of expr) {
    if (!("match" in s)) continue;
    const m = s.match;
    const desc = describeMatch(m);
    if (desc) parts.push(desc);
  }
  return parts;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAction(expr: any[]): string {
  const extras: string[] = [];
  let verdict = "continuer";

  for (const s of expr) {
    if ("accept" in s) verdict = "accepter";
    else if ("drop" in s) verdict = "bloquer";
    else if ("reject" in s) verdict = "rejeter";
    else if ("jump" in s) verdict = `aller à ${s.jump.target}`;
    else if ("masquerade" in s) verdict = "masquerade (NAT)";
    else if ("dnat" in s) verdict = `rediriger vers ${formatNat(s.dnat)}`;
    else if ("snat" in s) verdict = `changer source vers ${formatNat(s.snat)}`;
    else if ("log" in s) extras.push("journaliser");
    else if ("counter" in s && typeof s.counter === "object") extras.push("");
    else if ("limit" in s && typeof s.limit === "object") {
      extras.push(`max ${s.limit.rate}/${translatePer(s.limit.per)}`);
    }
  }

  const meaningful = extras.filter(Boolean);
  if (meaningful.length > 0) {
    return `${meaningful.join(", ")} puis ${verdict}`;
  }
  return verdict;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeMatch(match: any): string | null {
  const left = describeExpr(match.left);
  const right = describeExpr(match.right);
  const op = match.op ?? "==";

  if (!left || !right) return null;

  if (op === "==" || op === "in") {
    return `${left} = ${right}`;
  }
  if (op === "!=") return `${left} ≠ ${right}`;
  return `${left} ${op} ${right}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function describeExpr(expr: any): string | null {
  if (expr == null) return null;
  if (typeof expr === "string") return friendlyValue(expr);
  if (typeof expr === "number") return String(expr);
  if (Array.isArray(expr)) return expr.map(e => describeExpr(e) ?? "?").join(", ");

  if (typeof expr === "object") {
    if ("payload" in expr) {
      const p = expr.payload;
      return friendlyField(p.protocol, p.field);
    }
    if ("meta" in expr) return friendlyMeta(expr.meta.key);
    if ("ct" in expr) return friendlyCt(expr.ct.key);
    if ("set" in expr) {
      const v = expr.set;
      const items = (Array.isArray(v) ? v : [v]).map((e: unknown) => describeExpr(e) ?? "?");
      return items.join(", ");
    }
    if ("prefix" in expr) return `${describeExpr(expr.prefix.addr)}/${expr.prefix.len}`;
    if ("range" in expr) return `${describeExpr(expr.range[0])}-${describeExpr(expr.range[1])}`;
  }
  return null;
}

function friendlyField(proto: string | undefined, field: string | undefined): string {
  const labels: Record<string, string> = {
    "tcp dport": "port TCP destination",
    "tcp sport": "port TCP source",
    "udp dport": "port UDP destination",
    "udp sport": "port UDP source",
    "ip saddr": "IP source",
    "ip daddr": "IP destination",
    "ip6 saddr": "IPv6 source",
    "ip6 daddr": "IPv6 destination",
    "icmp type": "type ICMP",
    "icmpv6 type": "type ICMPv6",
  };
  const key = `${proto ?? ""} ${field ?? ""}`.trim();
  return labels[key] ?? key;
}

function friendlyMeta(key: string): string {
  const labels: Record<string, string> = {
    iifname: "interface d'entrée",
    oifname: "interface de sortie",
    iif: "interface d'entrée",
    oif: "interface de sortie",
    mark: "marque du paquet",
    protocol: "protocole",
    l4proto: "protocole L4",
    nfproto: "famille",
    skuid: "UID du processus",
    skgid: "GID du processus",
  };
  return labels[key] ?? `meta ${key}`;
}

function friendlyCt(key: string): string {
  const labels: Record<string, string> = {
    state: "état connexion",
    status: "statut conntrack",
    mark: "marque conntrack",
    direction: "direction",
  };
  return labels[key] ?? `ct ${key}`;
}

function friendlyValue(val: string): string {
  const labels: Record<string, string> = {
    established: "établie",
    related: "liée",
    new: "nouvelle",
    invalid: "invalide",
    untracked: "non suivie",
    lo: "loopback",
    "echo-request": "ping",
    "echo-reply": "réponse ping",
  };
  return labels[val] ?? val;
}

function translatePer(per: string): string {
  const labels: Record<string, string> = {
    second: "sec",
    minute: "min",
    hour: "heure",
    day: "jour",
  };
  return labels[per] ?? per;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatNat(nat: any): string {
  let s = "";
  if (nat?.addr) s += nat.addr;
  if (nat?.port) s += `:${nat.port}`;
  return s || "?";
}

/** Get counter from a rule's expressions, if any */
export function getRuleCounter(expr: NftStatement[]): { packets: number; bytes: number } | null {
  for (const s of expr) {
    if ("counter" in s && typeof s.counter === "object" && s.counter !== null) {
      return s.counter as { packets: number; bytes: number };
    }
  }
  return null;
}

/** Does this rule have a limit statement? */
export function getRuleLimit(expr: NftStatement[]): string | null {
  for (const s of expr) {
    if ("limit" in s && typeof s.limit === "object" && s.limit !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const l = s.limit as any;
      const burst = l.burst ? ` (burst ${l.burst})` : "";
      return `${l.rate ?? 0}/${translatePer(l.per ?? "second")}${burst}`;
    }
  }
  return null;
}
