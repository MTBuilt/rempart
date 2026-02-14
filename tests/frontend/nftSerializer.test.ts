import { describe, it, expect } from "vitest";
import { serializeRule } from "../../frontend/src/utils/nftSerializer";
import type { NftRule } from "../../frontend/src/types/nftables";

function makeRule(expr: Record<string, unknown>[], comment?: string): NftRule {
  return { family: "inet", table: "filter", chain: "input", handle: 1, expr, comment };
}

// ── serializeRule ────────────────────────────

describe("serializeRule", () => {
  it("serializes accept", () => {
    const rule = makeRule([{ accept: null }]);
    expect(serializeRule(rule)).toBe("accept");
  });

  it("serializes drop", () => {
    const rule = makeRule([{ drop: null }]);
    expect(serializeRule(rule)).toBe("drop");
  });

  it("serializes reject", () => {
    const rule = makeRule([{ reject: null }]);
    expect(serializeRule(rule)).toBe("reject");
  });

  it("serializes TCP dport match + accept", () => {
    const rule = makeRule([
      { match: { op: "==", left: { payload: { protocol: "tcp", field: "dport" } }, right: 22 } },
      { accept: null },
    ]);
    expect(serializeRule(rule)).toBe("tcp dport 22 accept");
  });

  it("serializes port set", () => {
    const rule = makeRule([
      { match: { op: "==", left: { payload: { protocol: "tcp", field: "dport" } }, right: { set: [80, 443] } } },
      { accept: null },
    ]);
    expect(serializeRule(rule)).toBe("tcp dport { 80, 443 } accept");
  });

  it("serializes ct state match", () => {
    const rule = makeRule([
      { match: { op: "==", left: { ct: { key: "state" } }, right: ["established", "related"] } },
      { accept: null },
    ]);
    const result = serializeRule(rule);
    expect(result).toContain("ct state");
    expect(result).toContain("established");
    expect(result).toContain("accept");
  });

  it("serializes meta iifname match", () => {
    const rule = makeRule([
      { match: { op: "==", left: { meta: { key: "iifname" } }, right: "lo" } },
      { accept: null },
    ]);
    expect(serializeRule(rule)).toBe("meta iifname lo accept");
  });

  it("serializes IP prefix (CIDR)", () => {
    const rule = makeRule([
      { match: { op: "==", left: { payload: { protocol: "ip", field: "saddr" } }, right: { prefix: { addr: "192.168.1.0", len: 24 } } } },
      { drop: null },
    ]);
    expect(serializeRule(rule)).toBe("ip saddr 192.168.1.0/24 drop");
  });

  it("serializes != operator", () => {
    const rule = makeRule([
      { match: { op: "!=", left: { payload: { protocol: "tcp", field: "dport" } }, right: 22 } },
      { drop: null },
    ]);
    expect(serializeRule(rule)).toBe("tcp dport != 22 drop");
  });

  it("serializes counter", () => {
    const rule = makeRule([
      { counter: { packets: 0, bytes: 0 } },
      { accept: null },
    ]);
    expect(serializeRule(rule)).toContain("counter");
  });

  it("serializes named counter", () => {
    const rule = makeRule([
      { counter: "my_counter" },
      { accept: null },
    ]);
    expect(serializeRule(rule)).toContain("counter name my_counter");
  });

  it("serializes log with prefix and level", () => {
    const rule = makeRule([
      { log: { prefix: "DROP: ", level: "warn" } },
      { drop: null },
    ]);
    const result = serializeRule(rule);
    expect(result).toContain('log prefix "DROP: " level warn');
  });

  it("serializes limit", () => {
    const rule = makeRule([
      { limit: { rate: 5, per: "second" } },
      { accept: null },
    ]);
    expect(serializeRule(rule)).toContain("limit rate 5/second");
  });

  it("serializes limit with burst", () => {
    const rule = makeRule([
      { limit: { rate: 3, per: "minute", burst: 10, unit: "packets" } },
      { accept: null },
    ]);
    const result = serializeRule(rule);
    expect(result).toContain("limit rate 3/minute");
    expect(result).toContain("burst 10 packets");
  });

  it("serializes jump", () => {
    const rule = makeRule([{ jump: { target: "my_chain" } }]);
    expect(serializeRule(rule)).toBe("jump my_chain");
  });

  it("serializes goto", () => {
    const rule = makeRule([{ goto: { target: "other_chain" } }]);
    expect(serializeRule(rule)).toBe("goto other_chain");
  });

  it("serializes masquerade", () => {
    const rule = makeRule([{ masquerade: null }]);
    expect(serializeRule(rule)).toBe("masquerade");
  });

  it("serializes dnat", () => {
    const rule = makeRule([
      { dnat: { addr: "192.168.1.10", port: 80 } },
    ]);
    expect(serializeRule(rule)).toBe("dnat to 192.168.1.10 :80");
  });

  it("serializes snat", () => {
    const rule = makeRule([
      { snat: { addr: "10.0.0.1" } },
    ]);
    expect(serializeRule(rule)).toBe("snat to 10.0.0.1");
  });

  it("serializes redirect", () => {
    const rule = makeRule([
      { redirect: { port: 8080 } },
    ]);
    expect(serializeRule(rule)).toBe("redirect to :8080");
  });

  it("serializes notrack", () => {
    const rule = makeRule([{ notrack: null }]);
    expect(serializeRule(rule)).toBe("notrack");
  });

  it("serializes comment", () => {
    const rule = makeRule([{ accept: null }], "Allow all");
    expect(serializeRule(rule)).toBe('accept comment "Allow all"');
  });

  it("serializes complex rule: tcp dport 22 counter log accept", () => {
    const rule = makeRule([
      { match: { op: "==", left: { payload: { protocol: "tcp", field: "dport" } }, right: 22 } },
      { counter: { packets: 100, bytes: 5000 } },
      { log: { prefix: "SSH: " } },
      { accept: null },
    ]);
    const result = serializeRule(rule);
    expect(result).toContain("tcp dport 22");
    expect(result).toContain("counter");
    expect(result).toContain('log prefix "SSH: "');
    expect(result).toContain("accept");
  });

  it("serializes range expression", () => {
    const rule = makeRule([
      { match: { op: "==", left: { payload: { protocol: "tcp", field: "dport" } }, right: { range: [1024, 65535] } } },
      { accept: null },
    ]);
    expect(serializeRule(rule)).toContain("1024-65535");
  });

  it("serializes concat expression", () => {
    const rule = makeRule([
      { match: { op: "==", left: { concat: [{ payload: { protocol: "ip", field: "saddr" } }, { payload: { protocol: "tcp", field: "dport" } }] }, right: { set: [] } } },
    ]);
    const result = serializeRule(rule);
    expect(result).toContain("ip saddr . tcp dport");
  });
});
