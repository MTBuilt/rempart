import { describe, it, expect } from "vitest";
import {
  INITIAL_STATE,
  TEMPLATES,
  buildStatements,
  type BuilderState,
} from "../../frontend/src/components/RuleBuilder/buildRule";
import { reverseParseRule } from "../../frontend/src/components/RuleBuilder/reverseParseRule";
import type { NftRule } from "../../frontend/src/types/nftables";

/** Helper: build a rule from state, then reverse-parse it. */
function roundTrip(patch: Partial<BuilderState>) {
  const state: BuilderState = { ...INITIAL_STATE, ...patch };
  const rule: NftRule = {
    family: "inet",
    table: "filter",
    chain: "input",
    handle: 42,
    expr: buildStatements(state),
    comment: state.comment || undefined,
  };
  return reverseParseRule(rule);
}

// ── Round-trip tests ─────────────────────────

describe("reverseParseRule round-trip", () => {
  it("handles basic accept (no conditions)", () => {
    const { state, isExact } = roundTrip({ action: "accept" });
    expect(isExact).toBe(true);
    expect(state.action).toBe("accept");
  });

  it("handles basic drop", () => {
    const { state, isExact } = roundTrip({ action: "drop" });
    expect(isExact).toBe(true);
    expect(state.action).toBe("drop");
  });

  it("handles reject", () => {
    const { state, isExact } = roundTrip({ action: "reject" });
    expect(isExact).toBe(true);
    expect(state.action).toBe("reject");
  });

  it("handles masquerade", () => {
    const { state, isExact } = roundTrip({ action: "masquerade" });
    expect(isExact).toBe(true);
    expect(state.action).toBe("masquerade");
  });

  it("handles TCP single port", () => {
    const { state, isExact } = roundTrip({
      protocol: "tcp",
      port: "22",
      portType: "dport",
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.protocol).toBe("tcp");
    expect(state.port).toBe("22");
    expect(state.portType).toBe("dport");
  });

  it("handles UDP sport", () => {
    const { state, isExact } = roundTrip({
      protocol: "udp",
      port: "53",
      portType: "sport",
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.protocol).toBe("udp");
    expect(state.port).toBe("53");
    expect(state.portType).toBe("sport");
  });

  it("handles multi-port set", () => {
    const { state, isExact } = roundTrip({
      protocol: "tcp",
      port: "80,443",
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.protocol).toBe("tcp");
    expect(state.port).toBe("80,443");
  });

  it("handles source IP plain", () => {
    const { state, isExact } = roundTrip({
      srcIp: "10.0.0.1",
      action: "drop",
    });
    expect(isExact).toBe(true);
    expect(state.srcIp).toBe("10.0.0.1");
    expect(state.ipVersion).toBe("ip");
  });

  it("handles source IP CIDR", () => {
    const { state, isExact } = roundTrip({
      srcIp: "192.168.1.0/24",
      action: "drop",
    });
    expect(isExact).toBe(true);
    expect(state.srcIp).toBe("192.168.1.0/24");
  });

  it("handles destination IP", () => {
    const { state, isExact } = roundTrip({
      dstIp: "10.0.0.1",
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.dstIp).toBe("10.0.0.1");
  });

  it("handles IPv6 addresses", () => {
    const { state, isExact } = roundTrip({
      ipVersion: "ip6",
      srcIp: "::1",
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.ipVersion).toBe("ip6");
    expect(state.srcIp).toBe("::1");
  });

  it("handles interface in", () => {
    const { state, isExact } = roundTrip({
      iif: "eth0",
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.iif).toBe("eth0");
  });

  it("handles interface out", () => {
    const { state, isExact } = roundTrip({
      oif: "wlan0",
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.oif).toBe("wlan0");
  });

  it("handles single CT state", () => {
    const { state, isExact } = roundTrip({
      ctStates: ["new"],
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.ctStates).toEqual(["new"]);
  });

  it("handles multiple CT states", () => {
    const { state, isExact } = roundTrip({
      ctStates: ["established", "related"],
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.ctStates).toEqual(["established", "related"]);
  });

  it("handles ICMP type", () => {
    const { state, isExact } = roundTrip({
      protocol: "icmp",
      icmpType: "echo-request",
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.protocol).toBe("icmp");
    expect(state.icmpType).toBe("echo-request");
  });

  it("handles ICMPv6 type", () => {
    const { state, isExact } = roundTrip({
      protocol: "icmpv6",
      icmpType: "echo-reply",
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.protocol).toBe("icmpv6");
    expect(state.icmpType).toBe("echo-reply");
  });

  it("handles counter", () => {
    const { state, isExact } = roundTrip({
      enableCounter: true,
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.enableCounter).toBe(true);
  });

  it("handles limit with burst", () => {
    const { state, isExact } = roundTrip({
      enableLimit: true,
      limitRate: 10,
      limitPer: "minute",
      limitBurst: 5,
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.enableLimit).toBe(true);
    expect(state.limitRate).toBe(10);
    expect(state.limitPer).toBe("minute");
    expect(state.limitBurst).toBe(5);
  });

  it("handles log with prefix and level", () => {
    const { state, isExact } = roundTrip({
      enableLog: true,
      logPrefix: "DROP: ",
      logLevel: "warn",
      action: "drop",
    });
    expect(isExact).toBe(true);
    expect(state.enableLog).toBe(true);
    expect(state.logPrefix).toBe("DROP: ");
    expect(state.logLevel).toBe("warn");
  });

  it("handles jump with target", () => {
    const { state, isExact } = roundTrip({
      action: "jump",
      jumpTarget: "my_chain",
    });
    expect(isExact).toBe(true);
    expect(state.action).toBe("jump");
    expect(state.jumpTarget).toBe("my_chain");
  });

  it("handles dnat with addr and port", () => {
    const { state, isExact } = roundTrip({
      protocol: "tcp",
      port: "80",
      action: "dnat",
      dnatAddr: "192.168.1.10",
      dnatPort: "8080",
    });
    expect(isExact).toBe(true);
    expect(state.action).toBe("dnat");
    expect(state.dnatAddr).toBe("192.168.1.10");
    expect(state.dnatPort).toBe("8080");
  });

  it("handles comment", () => {
    const { state, isExact } = roundTrip({
      comment: "Allow SSH",
      action: "accept",
    });
    expect(isExact).toBe(true);
    expect(state.comment).toBe("Allow SSH");
  });

  it("handles complex rule (port + srcIp + counter + log + limit)", () => {
    const { state, isExact } = roundTrip({
      protocol: "tcp",
      port: "22",
      srcIp: "10.0.0.0/8",
      enableCounter: true,
      enableLog: true,
      logPrefix: "SSH: ",
      logLevel: "info",
      enableLimit: true,
      limitRate: 3,
      limitPer: "minute",
      limitBurst: 2,
      action: "accept",
      comment: "SSH from LAN",
    });
    expect(isExact).toBe(true);
    expect(state.protocol).toBe("tcp");
    expect(state.port).toBe("22");
    expect(state.srcIp).toBe("10.0.0.0/8");
    expect(state.enableCounter).toBe(true);
    expect(state.enableLog).toBe(true);
    expect(state.logPrefix).toBe("SSH: ");
    expect(state.enableLimit).toBe(true);
    expect(state.limitRate).toBe(3);
    expect(state.action).toBe("accept");
    expect(state.comment).toBe("SSH from LAN");
  });
});

// ── Template round-trips ─────────────────────

describe("reverseParseRule template round-trips", () => {
  for (const tpl of TEMPLATES) {
    if (tpl.key === "custom") continue; // empty patch, nothing to test

    it(`round-trips template: ${tpl.key}`, () => {
      const patch = { ...tpl.patch };
      // Skip templates that require extra input (jump needs target, dnat needs addr)
      if (patch.action === "jump") patch.jumpTarget = "test_chain";
      if (patch.action === "dnat") {
        patch.dnatAddr = "10.0.0.5";
        patch.dnatPort = "80";
      }
      // Set port for templates that need it
      if (patch.protocol === "tcp" || patch.protocol === "udp") {
        if (!patch.port) (patch as Partial<BuilderState>).port = "443";
      }

      const { state, isExact } = roundTrip(patch);
      expect(isExact).toBe(true);
      expect(state.action).toBe(patch.action ?? INITIAL_STATE.action);

      if (patch.protocol) expect(state.protocol).toBe(patch.protocol);
      if (patch.enableCounter) expect(state.enableCounter).toBe(true);
      if (patch.enableLimit) expect(state.enableLimit).toBe(true);
      if (patch.enableLog) expect(state.enableLog).toBe(true);
      if (patch.ctStates) expect(state.ctStates).toEqual(patch.ctStates);
    });
  }
});

// ── isExact = false ──────────────────────────

describe("reverseParseRule isExact", () => {
  it("returns isExact=false for unrecognized statements", () => {
    const rule: NftRule = {
      family: "inet",
      table: "filter",
      chain: "input",
      handle: 99,
      expr: [
        { some_unknown_statement: { foo: "bar" } },
        { accept: null },
      ],
    };
    const { state, isExact } = reverseParseRule(rule);
    expect(isExact).toBe(false);
    expect(state.action).toBe("accept");
  });

  it("returns isExact=true when all statements are recognized", () => {
    const rule: NftRule = {
      family: "inet",
      table: "filter",
      chain: "input",
      handle: 99,
      expr: [
        { counter: { packets: 100, bytes: 5000 } },
        { accept: null },
      ],
    };
    const { isExact } = reverseParseRule(rule);
    expect(isExact).toBe(true);
  });

  it("returns isExact=false for unrecognized match", () => {
    const rule: NftRule = {
      family: "inet",
      table: "filter",
      chain: "input",
      handle: 99,
      expr: [
        {
          match: {
            op: "==",
            left: { payload: { protocol: "unknown_proto", field: "unknown_field" } },
            right: "value",
          },
        },
        { drop: null },
      ],
    };
    const { state, isExact } = reverseParseRule(rule);
    expect(isExact).toBe(false);
    expect(state.action).toBe("drop");
  });
});
