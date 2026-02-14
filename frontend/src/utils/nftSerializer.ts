/**
 * Client-side serializer: RulesetModel → nft text syntax.
 *
 * This runs in the browser for instant tree-to-code updates.
 * It produces valid nft syntax that can be loaded with `nft -f`.
 */

import type {
  RulesetModel,
  TableModel,
  ChainModel,
  NftRule,
  NftSet,
  NftMap,
  NftFlowtable,
  NftCounter,
} from "../types/nftables";

export function serializeRuleset(
  model: RulesetModel,
  flush = true,
): string {
  const lines: string[] = [];
  if (flush) {
    lines.push("flush ruleset");
    lines.push("");
  }

  for (const tm of model.tables) {
    lines.push(...serializeTable(tm));
    lines.push("");
  }

  return lines.join("\n").trimEnd() + "\n";
}

function serializeTable(tm: TableModel): string[] {
  const t = tm.table;
  const flagsStr = t.flags?.length ? `\n\tflags ${t.flags.join(", ")}` : "";
  const lines = [`table ${t.family} ${t.name} {${flagsStr}`];

  for (const counter of tm.counters ?? []) {
    lines.push(...serializeNamedCounter(counter));
  }
  for (const s of tm.sets ?? []) {
    lines.push(...serializeSet(s));
  }
  for (const m of tm.maps ?? []) {
    lines.push(...serializeMapObj(m));
  }
  for (const ft of tm.flowtables ?? []) {
    lines.push(...serializeFlowtable(ft));
  }
  for (const cm of tm.chains) {
    lines.push(...serializeChain(cm));
  }

  lines.push("}");
  return lines;
}

function serializeChain(cm: ChainModel): string[] {
  const c = cm.chain;
  const lines = [`\tchain ${c.name} {`];

  if (c.type && c.hook != null) {
    const prio = c.prio ?? 0;
    const policy = c.policy ? ` policy ${c.policy};` : "";
    const dev = c.dev ? ` devices = { ${c.dev} };` : "";
    lines.push(`\t\ttype ${c.type} hook ${c.hook} priority ${prio};${policy}${dev}`);
  }

  for (const rule of cm.rules) {
    lines.push(`\t\t${serializeRule(rule)}`);
  }

  lines.push("\t}");
  return lines;
}

export function serializeRule(rule: NftRule): string {
  const parts = rule.expr.map(serializeStatement);
  let result = parts.join(" ");
  if (rule.comment) {
    result += ` comment "${rule.comment}"`;
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeStatement(stmt: Record<string, any>): string {
  if ("match" in stmt) return serializeMatch(stmt.match);
  if ("accept" in stmt) return "accept";
  if ("drop" in stmt) return "drop";
  if ("return" in stmt) return "return";
  if ("continue" in stmt) return "continue";
  if ("jump" in stmt) return `jump ${stmt.jump.target}`;
  if ("goto" in stmt) return `goto ${stmt.goto.target}`;
  if ("counter" in stmt) return serializeCounterStmt(stmt.counter);
  if ("log" in stmt) return serializeLog(stmt.log);
  if ("reject" in stmt) return serializeReject(stmt.reject);
  if ("limit" in stmt) return serializeLimitStmt(stmt.limit);
  if ("masquerade" in stmt) return serializeMasquerade(stmt.masquerade);
  if ("snat" in stmt) return serializeNat("snat", stmt.snat);
  if ("dnat" in stmt) return serializeNat("dnat", stmt.dnat);
  if ("redirect" in stmt) return serializeRedirect(stmt.redirect);
  if ("notrack" in stmt) return "notrack";
  if ("mangle" in stmt) return serializeMangle(stmt.mangle);

  // Fallback
  for (const [key, val] of Object.entries(stmt)) {
    return val ? `${key} ${serializeExpr(val)}` : key;
  }
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeMatch(match: any): string {
  const left = serializeExpr(match.left);
  const right = serializeExpr(match.right);
  const op = match.op ?? "==";

  if (op === "==") return `${left} ${right}`;
  if (op === "!=") return `${left} != ${right}`;
  return `${left} ${op} ${right}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeExpr(expr: any): string {
  if (expr == null) return "";
  if (typeof expr === "boolean") return String(expr);
  if (typeof expr === "number") return String(expr);
  if (typeof expr === "string") return expr;
  if (Array.isArray(expr)) {
    if (expr.length === 0) return "{}";
    return "{ " + expr.map(serializeExpr).join(", ") + " }";
  }
  if (typeof expr === "object") return serializeExprDict(expr);
  return String(expr);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeExprDict(expr: Record<string, any>): string {
  if ("payload" in expr) {
    const p = expr.payload;
    if (p.protocol && p.field) return `${p.protocol} ${p.field}`;
    if (p.base) return `@${p.base},${p.offset ?? 0},${p.len ?? 0}`;
    return `${p.protocol ?? ""} ${p.field ?? ""}`.trim();
  }
  if ("meta" in expr) return `meta ${expr.meta.key}`;
  if ("ct" in expr) {
    const ct = expr.ct;
    const parts = ["ct"];
    if (ct.dir) parts.push(ct.dir);
    parts.push(ct.key);
    return parts.join(" ");
  }
  if ("prefix" in expr) {
    return `${serializeExpr(expr.prefix.addr)}/${expr.prefix.len}`;
  }
  if ("range" in expr) {
    return `${serializeExpr(expr.range[0])}-${serializeExpr(expr.range[1])}`;
  }
  if ("set" in expr) {
    const val = expr.set;
    if (Array.isArray(val)) {
      return "{ " + val.map(serializeExpr).join(", ") + " }";
    }
    return "{ " + serializeExpr(val) + " }";
  }
  if ("concat" in expr) {
    return expr.concat.map(serializeExpr).join(" . ");
  }
  if ("map" in expr) {
    return `${serializeExpr(expr.map.key)} map ${serializeExpr(expr.map.data)}`;
  }
  if ("numgen" in expr) {
    return `numgen ${expr.numgen.mode ?? "inc"} mod ${expr.numgen.mod ?? 0}`;
  }
  if ("fib" in expr) {
    const flags = (expr.fib.flags ?? []).join(" . ");
    return `fib ${flags} ${expr.fib.result ?? ""}`;
  }
  if ("rt" in expr) return `rt ${expr.rt.key}`;
  if ("socket" in expr) return `socket ${expr.socket.key}`;
  if ("osf" in expr) return `osf ${expr.osf.key}`;

  // Bitwise
  for (const op of ["|", "^", "&", "<<", ">>"]) {
    if (op in expr) {
      return expr[op].map(serializeExpr).join(` ${op} `);
    }
  }

  // Fallback
  for (const [key, val] of Object.entries(expr)) {
    if (val == null) return key;
    return `${key} ${serializeExpr(val)}`;
  }
  return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeCounterStmt(counter: any): string {
  if (typeof counter === "string") return `counter name ${counter}`;
  return "counter";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeLog(log: any): string {
  const parts = ["log"];
  if (log?.prefix) parts.push(`prefix "${log.prefix}"`);
  if (log?.level) parts.push(`level ${log.level}`);
  if (log?.group) parts.push(`group ${log.group}`);
  return parts.join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeReject(reject: any): string {
  if (!reject) return "reject";
  const parts = ["reject"];
  if (reject.type) parts.push(`with ${reject.type}`);
  if (reject.expr) parts.push(serializeExpr(reject.expr));
  return parts.join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeLimitStmt(limit: any): string {
  if (typeof limit === "string") return `limit name ${limit}`;
  if (limit && typeof limit === "object") {
    const parts = [`limit rate ${limit.rate ?? 0}/${limit.per ?? "second"}`];
    if (limit.burst) parts.push(`burst ${limit.burst} ${limit.unit ?? "packets"}`);
    return parts.join(" ");
  }
  return "limit";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeMasquerade(masq: any): string {
  if (!masq) return "masquerade";
  if (masq.port) return `masquerade to :${serializeExpr(masq.port)}`;
  return "masquerade";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeNat(kind: string, nat: any): string {
  const parts = [kind, "to"];
  if (nat.addr) parts.push(serializeExpr(nat.addr));
  if (nat.port) parts.push(`:${serializeExpr(nat.port)}`);
  return parts.join(" ");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeRedirect(redirect: any): string {
  if (!redirect) return "redirect";
  if (redirect.port) return `redirect to :${serializeExpr(redirect.port)}`;
  return "redirect";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeMangle(mangle: any): string {
  return `${serializeExpr(mangle.key)} set ${serializeExpr(mangle.value)}`;
}

function serializeSet(s: NftSet): string[] {
  const typeStr = Array.isArray(s.type) ? s.type.join(" . ") : s.type;
  const lines = [`\tset ${s.name} {`];
  lines.push(`\t\ttype ${typeStr}`);
  if (s.flags?.length) lines.push(`\t\tflags ${s.flags.join(", ")}`);
  if (s.timeout != null) lines.push(`\t\ttimeout ${s.timeout}s`);
  if (s.size != null) lines.push(`\t\tsize ${s.size}`);
  if (s["auto-merge"]) lines.push("\t\tauto-merge");
  if (s.elem) {
    const elems = Array.isArray(s.elem) ? s.elem : [s.elem];
    const elemStrs = elems.map(serializeExpr);
    lines.push(`\t\telements = { ${elemStrs.join(", ")} }`);
  }
  lines.push("\t}");
  return lines;
}

function serializeMapObj(m: NftMap): string[] {
  const typeStr = Array.isArray(m.type) ? m.type.join(" . ") : m.type;
  const lines = [`\tmap ${m.name} {`];
  lines.push(`\t\ttype ${typeStr} : ${m.map}`);
  if (m.flags?.length) lines.push(`\t\tflags ${m.flags.join(", ")}`);
  if (m.size != null) lines.push(`\t\tsize ${m.size}`);
  lines.push("\t}");
  return lines;
}

function serializeFlowtable(ft: NftFlowtable): string[] {
  const devs = Array.isArray(ft.dev) ? ft.dev : [ft.dev];
  const lines = [`\tflowtable ${ft.name} {`];
  lines.push(`\t\thook ${ft.hook} priority ${ft.prio}`);
  lines.push(`\t\tdevices = { ${devs.join(", ")} }`);
  lines.push("\t}");
  return lines;
}

function serializeNamedCounter(c: NftCounter): string[] {
  return [
    `\tcounter ${c.name} {`,
    `\t\tpackets ${c.packets} bytes ${c.bytes}`,
    "\t}",
  ];
}
