import { describe, it, expect } from "vitest";
import {
  INITIAL_STATE,
  TEMPLATES,
  KNOWN_PORTS,
  buildStatements,
  buildPreviewRule,
  generateInsights,
  canSubmit,
  type BuilderState,
} from "../../frontend/src/components/RuleBuilder/buildRule";

// ── buildStatements ──────────────────────────

describe("buildStatements", () => {
  it("returns empty array for initial state", () => {
    const stmts = buildStatements(INITIAL_STATE);
    // Initial state has action=accept, so at minimum one statement
    expect(stmts.length).toBe(1);
    expect(stmts[0]).toHaveProperty("accept");
  });

  it("builds TCP port match", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      protocol: "tcp",
      port: "22",
      action: "accept",
    };
    const stmts = buildStatements(state);
    const match = stmts.find((s) => "match" in s);
    expect(match).toBeDefined();
    expect(match!.match.left.payload.protocol).toBe("tcp");
    expect(match!.match.left.payload.field).toBe("dport");
    expect(match!.match.right).toBe(22);
  });

  it("builds multi-port set", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      protocol: "tcp",
      port: "80,443",
      action: "accept",
    };
    const stmts = buildStatements(state);
    const match = stmts.find((s) => "match" in s);
    expect(match!.match.right).toEqual({ set: [80, 443] });
  });

  it("builds source IP match with CIDR", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      srcIp: "192.168.1.0/24",
      action: "drop",
    };
    const stmts = buildStatements(state);
    const match = stmts.find((s) => "match" in s);
    expect(match!.match.left.payload.field).toBe("saddr");
    expect(match!.match.right).toEqual({ prefix: { addr: "192.168.1.0", len: 24 } });
  });

  it("builds source IP match without CIDR", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      srcIp: "10.0.0.1",
      action: "drop",
    };
    const stmts = buildStatements(state);
    const match = stmts.find((s) => "match" in s);
    expect(match!.match.right).toBe("10.0.0.1");
  });

  it("builds CT state match", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      ctStates: ["established", "related"],
      action: "accept",
    };
    const stmts = buildStatements(state);
    const match = stmts.find((s) => "match" in s);
    expect(match!.match.left).toEqual({ ct: { key: "state" } });
    expect(match!.match.right).toEqual(["established", "related"]);
  });

  it("builds single CT state as string", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      ctStates: ["new"],
      action: "accept",
    };
    const stmts = buildStatements(state);
    const match = stmts.find((s) => "match" in s);
    expect(match!.match.right).toBe("new");
  });

  it("builds ICMP type match", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      protocol: "icmp",
      icmpType: "echo-request",
      action: "accept",
    };
    const stmts = buildStatements(state);
    const match = stmts.find((s) => "match" in s);
    expect(match!.match.left.payload.protocol).toBe("icmp");
    expect(match!.match.left.payload.field).toBe("type");
    expect(match!.match.right).toBe("echo-request");
  });

  it("builds interface matches", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      iif: "eth0",
      oif: "wlan0",
      action: "accept",
    };
    const stmts = buildStatements(state);
    const iifMatch = stmts.find(
      (s) => "match" in s && s.match.left?.meta?.key === "iifname",
    );
    const oifMatch = stmts.find(
      (s) => "match" in s && s.match.left?.meta?.key === "oifname",
    );
    expect(iifMatch!.match.right).toBe("eth0");
    expect(oifMatch!.match.right).toBe("wlan0");
  });

  it("adds counter statement", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      enableCounter: true,
      action: "accept",
    };
    const stmts = buildStatements(state);
    expect(stmts.some((s) => "counter" in s)).toBe(true);
  });

  it("adds limit statement", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      enableLimit: true,
      limitRate: 5,
      limitPer: "minute",
      limitBurst: 10,
      action: "accept",
    };
    const stmts = buildStatements(state);
    const limit = stmts.find((s) => "limit" in s);
    expect(limit!.limit.rate).toBe(5);
    expect(limit!.limit.per).toBe("minute");
    expect(limit!.limit.burst).toBe(10);
  });

  it("adds log statement", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      enableLog: true,
      logPrefix: "DROP: ",
      logLevel: "warn",
      action: "drop",
    };
    const stmts = buildStatements(state);
    const log = stmts.find((s) => "log" in s);
    expect(log!.log.prefix).toBe("DROP: ");
    expect(log!.log.level).toBe("warn");
  });

  it("builds drop verdict", () => {
    const state: BuilderState = { ...INITIAL_STATE, action: "drop" };
    const stmts = buildStatements(state);
    expect(stmts[stmts.length - 1]).toHaveProperty("drop");
  });

  it("builds reject verdict", () => {
    const state: BuilderState = { ...INITIAL_STATE, action: "reject" };
    const stmts = buildStatements(state);
    expect(stmts[stmts.length - 1]).toHaveProperty("reject");
  });

  it("builds jump verdict", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      action: "jump",
      jumpTarget: "my_chain",
    };
    const stmts = buildStatements(state);
    expect(stmts[stmts.length - 1]).toEqual({ jump: { target: "my_chain" } });
  });

  it("builds dnat verdict", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      action: "dnat",
      dnatAddr: "192.168.1.10",
      dnatPort: "80",
    };
    const stmts = buildStatements(state);
    const dnat = stmts[stmts.length - 1];
    expect(dnat.dnat.addr).toBe("192.168.1.10");
    expect(dnat.dnat.port).toBe(80);
  });

  it("builds masquerade verdict", () => {
    const state: BuilderState = { ...INITIAL_STATE, action: "masquerade" };
    const stmts = buildStatements(state);
    expect(stmts[stmts.length - 1]).toHaveProperty("masquerade");
  });

  it("respects statement order: matches → options → verdict", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      protocol: "tcp",
      port: "22",
      enableCounter: true,
      enableLog: true,
      logPrefix: "SSH: ",
      action: "accept",
    };
    const stmts = buildStatements(state);
    const keys = stmts.map((s) => Object.keys(s)[0]);
    const matchIdx = keys.indexOf("match");
    const counterIdx = keys.indexOf("counter");
    const logIdx = keys.indexOf("log");
    const acceptIdx = keys.indexOf("accept");
    expect(matchIdx).toBeLessThan(counterIdx);
    expect(counterIdx).toBeLessThan(logIdx);
    expect(logIdx).toBeLessThan(acceptIdx);
  });
});

// ── buildPreviewRule ─────────────────────────

describe("buildPreviewRule", () => {
  it("creates a valid NftRule", () => {
    const rule = buildPreviewRule(INITIAL_STATE, "inet", "filter", "input");
    expect(rule.family).toBe("inet");
    expect(rule.table).toBe("filter");
    expect(rule.chain).toBe("input");
    expect(rule.handle).toBe(0);
    expect(rule.expr.length).toBeGreaterThan(0);
  });

  it("includes comment when set", () => {
    const state = { ...INITIAL_STATE, comment: "test rule" };
    const rule = buildPreviewRule(state, "inet", "filter", "input");
    expect(rule.comment).toBe("test rule");
  });

  it("omits comment when empty", () => {
    const rule = buildPreviewRule(INITIAL_STATE, "inet", "filter", "input");
    expect(rule.comment).toBeUndefined();
  });
});

// ── Templates ────────────────────────────────

describe("TEMPLATES", () => {
  it("has 8 templates", () => {
    expect(TEMPLATES.length).toBe(8);
  });

  it("each template has required fields", () => {
    for (const tpl of TEMPLATES) {
      expect(tpl.key).toBeTruthy();
      expect(tpl.label).toBeTruthy();
      expect(tpl.description).toBeTruthy();
      expect(tpl.iconName).toBeTruthy();
      expect(tpl.color).toMatch(/^#/);
      expect(typeof tpl.patch).toBe("object");
    }
  });

  it("allow_port template sets protocol tcp", () => {
    const tpl = TEMPLATES.find((t) => t.key === "allow_port");
    expect(tpl!.patch.protocol).toBe("tcp");
    expect(tpl!.patch.action).toBe("accept");
  });

  it("custom template has empty patch", () => {
    const tpl = TEMPLATES.find((t) => t.key === "custom");
    expect(Object.keys(tpl!.patch).length).toBe(0);
  });
});

// ── KNOWN_PORTS ──────────────────────────────

describe("KNOWN_PORTS", () => {
  it("contains common ports", () => {
    expect(KNOWN_PORTS[22]).toBe("SSH");
    expect(KNOWN_PORTS[80]).toBe("HTTP");
    expect(KNOWN_PORTS[443]).toBe("HTTPS");
    expect(KNOWN_PORTS[53]).toBe("DNS");
    expect(KNOWN_PORTS[3306]).toContain("MySQL");
  });
});

// ── generateInsights ─────────────────────────

describe("generateInsights", () => {
  it("warns when no conditions set", () => {
    const insights = generateInsights(INITIAL_STATE);
    expect(insights.some((i) => i.type === "warning" && i.message.includes("TOUT"))).toBe(true);
  });

  it("identifies known port", () => {
    const state = { ...INITIAL_STATE, protocol: "tcp" as const, port: "22" };
    const insights = generateInsights(state);
    expect(insights.some((i) => i.type === "info" && i.message.includes("SSH"))).toBe(true);
  });

  it("suggests rate limit for SSH", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      protocol: "tcp",
      port: "22",
      action: "accept",
    };
    const insights = generateInsights(state);
    expect(insights.some((i) => i.type === "tip" && i.message.includes("force brute"))).toBe(true);
  });

  it("warns HTTP without HTTPS", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      protocol: "tcp",
      port: "80",
      action: "accept",
    };
    const insights = generateInsights(state);
    expect(insights.some((i) => i.message.includes("443"))).toBe(true);
  });

  it("warns dangerous port without IP filter", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      protocol: "tcp",
      port: "3306",
      action: "accept",
    };
    const insights = generateInsights(state);
    expect(insights.some((i) => i.type === "warning" && i.message.includes("3306"))).toBe(true);
  });

  it("no dangerous port warning with srcIp set", () => {
    const state: BuilderState = {
      ...INITIAL_STATE,
      protocol: "tcp",
      port: "3306",
      srcIp: "10.0.0.0/8",
      action: "accept",
    };
    const insights = generateInsights(state);
    expect(insights.some((i) => i.type === "warning" && i.message.includes("3306"))).toBe(false);
  });

  it("warns DNAT without address", () => {
    const state: BuilderState = { ...INITIAL_STATE, action: "dnat" };
    const insights = generateInsights(state);
    expect(insights.some((i) => i.type === "warning" && i.message.includes("DNAT"))).toBe(true);
  });

  it("warns jump without target", () => {
    const state: BuilderState = { ...INITIAL_STATE, action: "jump" };
    const insights = generateInsights(state);
    expect(insights.some((i) => i.type === "warning" && i.message.includes("Sauter"))).toBe(true);
  });

  it("provides masquerade info", () => {
    const state: BuilderState = { ...INITIAL_STATE, action: "masquerade" };
    const insights = generateInsights(state);
    expect(insights.some((i) => i.type === "info" && i.message.includes("Masquerade"))).toBe(true);
  });

  it("provides drop tip", () => {
    const state: BuilderState = { ...INITIAL_STATE, action: "drop" };
    const insights = generateInsights(state);
    expect(insights.some((i) => i.type === "tip" && i.message.includes("drop"))).toBe(true);
  });

  it("provides reject tip", () => {
    const state: BuilderState = { ...INITIAL_STATE, action: "reject" };
    const insights = generateInsights(state);
    expect(insights.some((i) => i.type === "tip" && i.message.includes("Rejeter"))).toBe(true);
  });
});

// ── canSubmit ────────────────────────────────

describe("canSubmit", () => {
  it("returns true for basic accept rule", () => {
    expect(canSubmit(INITIAL_STATE)).toBe(true);
  });

  it("returns false for jump without target", () => {
    expect(canSubmit({ ...INITIAL_STATE, action: "jump", jumpTarget: "" })).toBe(false);
  });

  it("returns true for jump with target", () => {
    expect(canSubmit({ ...INITIAL_STATE, action: "jump", jumpTarget: "my_chain" })).toBe(true);
  });

  it("returns false for dnat without address", () => {
    expect(canSubmit({ ...INITIAL_STATE, action: "dnat", dnatAddr: "" })).toBe(false);
  });

  it("returns true for dnat with address", () => {
    expect(canSubmit({ ...INITIAL_STATE, action: "dnat", dnatAddr: "10.0.0.1" })).toBe(true);
  });
});
