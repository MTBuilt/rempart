/**
 * Pure logic for the Rule Builder:
 * - BuilderState type & defaults
 * - Template definitions
 * - State → NftStatement[] conversion
 * - Insight generation
 * - Known port database
 */

import type { NftFamily, NftRule, NftStatement } from "../../types/nftables";

// ── Types ─────────────────────────────────────

export interface BuilderState {
  template: string;
  // Conditions
  protocol: "" | "tcp" | "udp" | "icmp" | "icmpv6";
  portType: "dport" | "sport";
  port: string;
  ipVersion: "ip" | "ip6";
  srcIp: string;
  dstIp: string;
  iif: string;
  oif: string;
  ctStates: string[];
  icmpType: string;
  // Action
  action: "accept" | "drop" | "reject" | "jump" | "dnat" | "masquerade";
  jumpTarget: string;
  dnatAddr: string;
  dnatPort: string;
  // Options
  enableCounter: boolean;
  enableLog: boolean;
  logPrefix: string;
  logLevel: string;
  enableLimit: boolean;
  limitRate: number;
  limitPer: "second" | "minute" | "hour" | "day";
  limitBurst: number;
  comment: string;
}

export const INITIAL_STATE: BuilderState = {
  template: "",
  protocol: "",
  portType: "dport",
  port: "",
  ipVersion: "ip",
  srcIp: "",
  dstIp: "",
  iif: "",
  oif: "",
  ctStates: [],
  icmpType: "",
  action: "accept",
  jumpTarget: "",
  dnatAddr: "",
  dnatPort: "",
  enableCounter: false,
  enableLog: false,
  logPrefix: "",
  logLevel: "warn",
  enableLimit: false,
  limitRate: 5,
  limitPer: "minute",
  limitBurst: 0,
  comment: "",
};

// ── Templates ─────────────────────────────────

export interface RuleTemplate {
  key: string;
  label: string;
  description: string;
  iconName: string;
  color: string;
  patch: Partial<BuilderState>;
}

export const TEMPLATES: RuleTemplate[] = [
  {
    key: "allow_port",
    label: "Autoriser un port",
    description: "Ouvrir un port TCP/UDP au trafic",
    iconName: "unlock",
    color: "#22c55e",
    patch: { protocol: "tcp", portType: "dport", action: "accept", enableCounter: true },
  },
  {
    key: "block_ip",
    label: "Bloquer une IP",
    description: "Interdire tout trafic d'une adresse",
    iconName: "ban",
    color: "#ef4444",
    patch: { action: "drop", enableCounter: true },
  },
  {
    key: "allow_established",
    label: "Connexions établies",
    description: "Autoriser les connexions déjà actives",
    iconName: "link",
    color: "#3b82f6",
    patch: { ctStates: ["established", "related"], action: "accept" },
  },
  {
    key: "rate_limit",
    label: "Limiter le débit",
    description: "Accepter avec une limite de connexions",
    iconName: "gauge",
    color: "#f59e0b",
    patch: {
      protocol: "tcp",
      portType: "dport",
      action: "accept",
      enableLimit: true,
      limitRate: 5,
      limitPer: "minute",
      enableCounter: true,
    },
  },
  {
    key: "allow_ping",
    label: "Autoriser le ping",
    description: "Accepter les requêtes ICMP echo",
    iconName: "activity",
    color: "#06b6d4",
    patch: {
      protocol: "icmp",
      icmpType: "echo-request",
      action: "accept",
      enableLimit: true,
      limitRate: 5,
      limitPer: "second",
    },
  },
  {
    key: "log_drop",
    label: "Journaliser et bloquer",
    description: "Enregistrer puis bloquer le trafic",
    iconName: "file-x",
    color: "#f97316",
    patch: {
      action: "drop",
      enableLog: true,
      logPrefix: "DROP: ",
      logLevel: "warn",
      enableCounter: true,
    },
  },
  {
    key: "port_redirect",
    label: "Redirection de port",
    description: "Transférer vers une autre adresse (DNAT)",
    iconName: "arrow-right-left",
    color: "#8b5cf6",
    patch: { protocol: "tcp", portType: "dport", action: "dnat" },
  },
  {
    key: "custom",
    label: "Personnalisée",
    description: "Construire une règle depuis zéro",
    iconName: "settings",
    color: "#94a3b8",
    patch: {},
  },
];

// ── Known Ports ───────────────────────────────

export const KNOWN_PORTS: Record<number, string> = {
  20: "FTP (données)",
  21: "FTP (contrôle)",
  22: "SSH",
  23: "Telnet",
  25: "SMTP",
  53: "DNS",
  67: "DHCP (serveur)",
  68: "DHCP (client)",
  69: "TFTP",
  80: "HTTP",
  110: "POP3",
  123: "NTP",
  143: "IMAP",
  161: "SNMP",
  389: "LDAP",
  443: "HTTPS",
  445: "SMB",
  465: "SMTPS",
  514: "Syslog",
  587: "SMTP (submission)",
  636: "LDAPS",
  993: "IMAPS",
  995: "POP3S",
  1433: "MS SQL",
  1521: "Oracle DB",
  2049: "NFS",
  3306: "MySQL / MariaDB",
  3389: "RDP (Bureau à distance)",
  5432: "PostgreSQL",
  5900: "VNC",
  6379: "Redis",
  8080: "HTTP (alternatif)",
  8443: "HTTPS (alternatif)",
  9090: "Prometheus",
  9200: "Elasticsearch",
  11211: "Memcached",
  27017: "MongoDB",
};

// ── Build NftStatement[] ──────────────────────

export function buildStatements(state: BuilderState): NftStatement[] {
  const stmts: NftStatement[] = [];

  // 1. Matches

  // Protocol + port
  if (state.protocol && state.port && (state.protocol === "tcp" || state.protocol === "udp")) {
    const ports = parsePort(state.port);
    if (ports.length > 0) {
      stmts.push({
        match: {
          op: "==",
          left: { payload: { protocol: state.protocol, field: state.portType } },
          right: ports.length === 1 ? ports[0] : { set: ports },
        },
      });
    }
  }

  // ICMP type
  if ((state.protocol === "icmp" || state.protocol === "icmpv6") && state.icmpType) {
    stmts.push({
      match: {
        op: "==",
        left: { payload: { protocol: state.protocol, field: "type" } },
        right: state.icmpType,
      },
    });
  }

  // Source IP
  if (state.srcIp.trim()) {
    stmts.push({
      match: {
        op: "==",
        left: { payload: { protocol: state.ipVersion, field: "saddr" } },
        right: parseCidr(state.srcIp.trim()),
      },
    });
  }

  // Destination IP
  if (state.dstIp.trim()) {
    stmts.push({
      match: {
        op: "==",
        left: { payload: { protocol: state.ipVersion, field: "daddr" } },
        right: parseCidr(state.dstIp.trim()),
      },
    });
  }

  // Interface in
  if (state.iif.trim()) {
    stmts.push({
      match: {
        op: "==",
        left: { meta: { key: "iifname" } },
        right: state.iif.trim(),
      },
    });
  }

  // Interface out
  if (state.oif.trim()) {
    stmts.push({
      match: {
        op: "==",
        left: { meta: { key: "oifname" } },
        right: state.oif.trim(),
      },
    });
  }

  // CT state
  if (state.ctStates.length > 0) {
    stmts.push({
      match: {
        op: "==",
        left: { ct: { key: "state" } },
        right: state.ctStates.length === 1 ? state.ctStates[0] : state.ctStates,
      },
    });
  }

  // 2. Options (before verdict)

  if (state.enableCounter) {
    stmts.push({ counter: { packets: 0, bytes: 0 } });
  }

  if (state.enableLimit) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const limitObj: Record<string, any> = {
      rate: state.limitRate,
      per: state.limitPer,
    };
    if (state.limitBurst > 0) limitObj.burst = state.limitBurst;
    stmts.push({ limit: limitObj });
  }

  if (state.enableLog) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logObj: Record<string, any> = {};
    if (state.logPrefix) logObj.prefix = state.logPrefix;
    if (state.logLevel) logObj.level = state.logLevel;
    stmts.push({ log: Object.keys(logObj).length > 0 ? logObj : null });
  }

  // 3. Verdict

  switch (state.action) {
    case "accept":
      stmts.push({ accept: null });
      break;
    case "drop":
      stmts.push({ drop: null });
      break;
    case "reject":
      stmts.push({ reject: null });
      break;
    case "jump":
      if (state.jumpTarget) stmts.push({ jump: { target: state.jumpTarget } });
      break;
    case "dnat": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dnat: Record<string, any> = {};
      if (state.dnatAddr) dnat.addr = state.dnatAddr;
      if (state.dnatPort) dnat.port = parseInt(state.dnatPort, 10);
      stmts.push({ dnat: dnat });
      break;
    }
    case "masquerade":
      stmts.push({ masquerade: null });
      break;
  }

  return stmts;
}

export function buildPreviewRule(
  state: BuilderState,
  family: NftFamily,
  table: string,
  chain: string,
): NftRule {
  return {
    family,
    table,
    chain,
    handle: 0,
    expr: buildStatements(state),
    comment: state.comment || undefined,
  };
}

// ── Insights ──────────────────────────────────

export interface Insight {
  type: "info" | "warning" | "tip";
  message: string;
}

export function generateInsights(state: BuilderState): Insight[] {
  const insights: Insight[] = [];

  // Port identification
  if (state.port) {
    const ports = state.port.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    for (const p of ports) {
      const name = KNOWN_PORTS[p];
      if (name) {
        insights.push({ type: "info", message: `Port ${p} = ${name}` });
      }
    }
  }

  // No conditions
  const hasConditions =
    state.port || state.srcIp || state.dstIp || state.iif || state.oif ||
    state.ctStates.length > 0 || state.icmpType;
  if (!hasConditions) {
    insights.push({
      type: "warning",
      message: "Aucune condition définie. Cette règle s'appliquera à TOUT le trafic de cette chaîne.",
    });
  }

  // Drop vs reject
  if (state.action === "drop") {
    insights.push({
      type: "tip",
      message:
        "Bloquer (drop) ignore silencieusement le paquet. L'expéditeur ne reçoit aucune réponse et attend un timeout. Plus discret mais ralentit les clients légitimes.",
    });
  }
  if (state.action === "reject") {
    insights.push({
      type: "tip",
      message:
        "Rejeter envoie une réponse ICMP « port unreachable ». L'expéditeur sait immédiatement que la connexion est refusée. Moins discret mais plus poli.",
    });
  }

  // SSH specific
  const portNums = state.port ? state.port.split(",").map((s) => parseInt(s.trim(), 10)) : [];
  if (portNums.includes(22)) {
    if (!state.enableLimit && state.action === "accept") {
      insights.push({
        type: "tip",
        message:
          "Port SSH détecté. Activez une limite de débit (ex : 3/minute) pour vous protéger contre les attaques par force brute.",
      });
    }
    if (state.action === "accept" && state.ctStates.length === 0) {
      insights.push({
        type: "tip",
        message:
          "Conseil : ajoutez un filtre sur l'état « new » pour ne limiter que les nouvelles connexions SSH.",
      });
    }
  }

  // HTTP without HTTPS
  if (portNums.includes(80) && !portNums.includes(443)) {
    insights.push({
      type: "tip",
      message: "Vous autorisez HTTP (80) mais pas HTTPS (443). Pensez à ajouter le port 443 pour le trafic chiffré.",
    });
  }

  // Dangerous ports
  const dangerousPorts = [3306, 5432, 6379, 11211, 27017];
  for (const dp of dangerousPorts) {
    if (portNums.includes(dp) && state.action === "accept" && !state.srcIp) {
      const name = KNOWN_PORTS[dp];
      insights.push({
        type: "warning",
        message: `${name} (port ${dp}) ne devrait pas être exposé sans filtrage IP. Ajoutez une IP source pour limiter l'accès.`,
      });
    }
  }

  // DNAT without addr
  if (state.action === "dnat" && !state.dnatAddr) {
    insights.push({ type: "warning", message: "L'action DNAT nécessite une adresse de destination." });
  }

  // Jump without target
  if (state.action === "jump" && !state.jumpTarget) {
    insights.push({ type: "warning", message: "L'action Sauter nécessite un nom de chaîne cible." });
  }

  // Masquerade
  if (state.action === "masquerade") {
    insights.push({
      type: "info",
      message:
        "Masquerade remplace l'adresse source par celle de l'interface de sortie. Utilisé pour le partage de connexion Internet (NAT sortant).",
    });
  }

  // Log
  if (state.enableLog) {
    insights.push({
      type: "info",
      message: "Les paquets correspondants seront enregistrés dans le journal système (journalctl ou /var/log/kern.log).",
    });
  }

  // Established
  if (state.ctStates.includes("established") && state.ctStates.includes("related")) {
    insights.push({
      type: "info",
      message:
        "Cette règle accepte les réponses aux connexions que vous avez initiées. Essentielle pour un firewall fonctionnel.",
    });
  }

  return insights;
}

export function canSubmit(state: BuilderState): boolean {
  if (state.action === "jump" && !state.jumpTarget) return false;
  if (state.action === "dnat" && !state.dnatAddr) return false;
  return true;
}

// ── Helpers ────────────────────────────────────

function parsePort(input: string): number[] {
  return input
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n) && n >= 1 && n <= 65535);
}

function parseCidr(input: string): unknown {
  if (input.includes("/")) {
    const [addr, len] = input.split("/");
    return { prefix: { addr, len: parseInt(len, 10) } };
  }
  return input;
}
