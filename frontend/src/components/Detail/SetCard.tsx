import { Database, Clock, Layers } from "lucide-react";
import type { NftSet } from "../../types/nftables";
import { humanizeSet } from "../../utils/humanize";

function formatElements(elem: unknown): string {
  if (Array.isArray(elem)) {
    const items = elem.slice(0, 5).map((e) =>
      typeof e === "object" && e !== null ? JSON.stringify(e) : String(e),
    );
    const suffix = elem.length > 5 ? ` +${elem.length - 5} de plus` : "";
    return items.join(", ") + suffix;
  }
  return String(elem);
}

export function SetCard({ set: s }: { set: NftSet }) {
  const description = humanizeSet(s);
  const typeStr = Array.isArray(s.type) ? s.type.join(" . ") : s.type;
  const elemCount = Array.isArray(s.elem) ? s.elem.length : s.elem ? 1 : 0;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <Database size={14} color="#8b5cf6" />
        <span style={styles.name}>{s.name}</span>
        <span style={styles.type}>{typeStr}</span>
      </div>
      <div style={styles.body}>
        <span style={styles.desc}>{description}</span>
      </div>
      {elemCount > 0 && s.elem != null && (
        <div style={styles.elements}>
          <Layers size={10} color="#64748b" />
          <span style={styles.elemText}>
            {formatElements(s.elem)}
          </span>
        </div>
      )}
      {((s.flags && s.flags.length > 0) || s.timeout != null) && (
        <div style={styles.flags}>
          {s.flags?.map((f) => (
            <span key={f} style={styles.flag}>
              {f}
            </span>
          ))}
          {s.timeout != null && (
            <span style={styles.flag}>
              <Clock size={10} />
              {s.timeout}s
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    border: "1px solid #1e293b",
    borderRadius: 10,
    padding: 14,
    background: "#111827",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  name: {
    fontSize: 14,
    fontWeight: 700,
    color: "#a78bfa",
  },
  type: {
    fontSize: 11,
    color: "#64748b",
    marginLeft: "auto",
  },
  body: {
    marginBottom: 8,
  },
  desc: {
    fontSize: 12,
    color: "#94a3b8",
  },
  elements: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 8px",
    background: "#0f172a",
    borderRadius: 6,
    marginBottom: 8,
    overflow: "hidden",
  },
  elemText: {
    fontSize: 11,
    color: "#cbd5e1",
    fontFamily: "'JetBrains Mono', monospace",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  flags: {
    display: "flex",
    gap: 6,
  },
  flag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 10,
    color: "#94a3b8",
    background: "#1e293b",
    padding: "2px 6px",
    borderRadius: 4,
  },
};
