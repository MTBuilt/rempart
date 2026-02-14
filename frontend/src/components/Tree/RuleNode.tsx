import { ArrowRight, Ban, Check, MessageSquare } from "lucide-react";
import type { NftRule } from "../../types/nftables";
import { useUiStore } from "../../state/uiStore";

interface RuleNodeProps {
  rule: NftRule;
  chainId: string;
}

export function RuleNode({ rule, chainId }: RuleNodeProps) {
  const { selectNode, selectedNodeId } = useUiStore();
  const nodeId = `${chainId}:rule:${rule.handle}`;
  const isSelected = selectedNodeId === nodeId;

  // Determine the verdict (last meaningful statement)
  const verdict = getVerdict(rule.expr);
  const summary = getRuleSummary(rule.expr);
  const hasCounter = rule.expr.some((s) => "counter" in s);

  return (
    <div
      style={{
        ...styles.row,
        background: isSelected ? "#1e3a5f" : "transparent",
      }}
      onClick={() => selectNode(nodeId)}
    >
      <VerdictIcon verdict={verdict} />
      <span style={styles.summary}>{summary}</span>
      <span style={{ ...styles.verdict, color: verdictColor(verdict) }}>
        {verdict}
      </span>
      {hasCounter && <span style={styles.counterBadge}>C</span>}
      {rule.comment && (
        <span style={styles.comment} title={rule.comment}>
          <MessageSquare size={10} />
          {rule.comment.length > 30
            ? rule.comment.slice(0, 30) + "..."
            : rule.comment}
        </span>
      )}
    </div>
  );
}

function VerdictIcon({ verdict }: { verdict: string }) {
  switch (verdict) {
    case "accept":
      return <Check size={12} color="#22c55e" />;
    case "drop":
    case "reject":
      return <Ban size={12} color="#ef4444" />;
    default:
      return <ArrowRight size={12} color="#94a3b8" />;
  }
}

function verdictColor(verdict: string): string {
  switch (verdict) {
    case "accept":
      return "#22c55e";
    case "drop":
    case "reject":
      return "#ef4444";
    case "jump":
    case "goto":
      return "#3b82f6";
    default:
      return "#94a3b8";
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getVerdict(expr: Record<string, any>[]): string {
  for (let i = expr.length - 1; i >= 0; i--) {
    const stmt = expr[i];
    if ("accept" in stmt) return "accept";
    if ("drop" in stmt) return "drop";
    if ("reject" in stmt) return "reject";
    if ("return" in stmt) return "return";
    if ("jump" in stmt) return `jump ${stmt.jump.target}`;
    if ("goto" in stmt) return `goto ${stmt.goto.target}`;
    if ("masquerade" in stmt) return "masquerade";
    if ("snat" in stmt) return "snat";
    if ("dnat" in stmt) return "dnat";
    if ("redirect" in stmt) return "redirect";
  }
  return "continue";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRuleSummary(expr: Record<string, any>[]): string {
  const matches: string[] = [];
  for (const stmt of expr) {
    if ("match" in stmt) {
      const m = stmt.match;
      const left = exprToShort(m.left);
      const right = exprToShort(m.right);
      const op = m.op === "==" ? "" : ` ${m.op}`;
      matches.push(`${left}${op} ${right}`);
    }
  }
  return matches.join(", ") || "(unconditional)";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function exprToShort(expr: any): string {
  if (typeof expr === "string" || typeof expr === "number") return String(expr);
  if (Array.isArray(expr)) return `{${expr.map(exprToShort).join(",")}}`;
  if (typeof expr === "object" && expr !== null) {
    if ("payload" in expr) {
      const p = expr.payload;
      return `${p.protocol || ""} ${p.field || ""}`.trim();
    }
    if ("meta" in expr) return `meta ${expr.meta.key}`;
    if ("ct" in expr) return `ct ${expr.ct.key}`;
    if ("set" in expr) {
      const v = expr.set;
      if (Array.isArray(v)) return `{${v.map(exprToShort).join(",")}}`;
      return `{${exprToShort(v)}}`;
    }
    if ("prefix" in expr) return `${exprToShort(expr.prefix.addr)}/${expr.prefix.len}`;
  }
  return "...";
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "3px 8px",
    cursor: "pointer",
    fontSize: 12,
    userSelect: "none",
    fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace",
  },
  summary: {
    color: "#cbd5e1",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 200,
  },
  verdict: {
    fontWeight: 700,
    fontSize: 11,
    textTransform: "uppercase" as const,
  },
  counterBadge: {
    fontSize: 9,
    fontWeight: 700,
    color: "#94a3b8",
    background: "#334155",
    padding: "1px 4px",
    borderRadius: 3,
  },
  comment: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    fontSize: 10,
    color: "#64748b",
    marginLeft: "auto",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
};
