import { Database } from "lucide-react";
import type { NftSet } from "../../types/nftables";
import { useUiStore } from "../../state/uiStore";

interface SetNodeProps {
  set: NftSet;
  tableId: string;
}

export function SetNode({ set: s, tableId }: SetNodeProps) {
  const { selectNode, selectedNodeId } = useUiStore();
  const nodeId = `${tableId}:set:${s.name}`;
  const isSelected = selectedNodeId === nodeId;

  const typeStr = Array.isArray(s.type) ? s.type.join(" . ") : s.type;
  const elemCount = Array.isArray(s.elem) ? s.elem.length : s.elem ? 1 : 0;

  return (
    <div
      style={{
        ...styles.row,
        background: isSelected ? "#1e3a5f" : "transparent",
      }}
      onClick={() => selectNode(nodeId)}
    >
      <Database size={14} color="#8b5cf6" />
      <span style={styles.name}>{s.name}</span>
      <span style={styles.type}>{typeStr}</span>
      {s.flags?.map((f) => (
        <span key={f} style={styles.flag}>
          {f}
        </span>
      ))}
      {elemCount > 0 && (
        <span style={styles.count}>{elemCount} elements</span>
      )}
      {s.timeout != null && (
        <span style={styles.meta}>timeout {s.timeout}s</span>
      )}
    </div>
  );
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
  },
  name: {
    color: "#a78bfa",
    fontWeight: 600,
  },
  type: {
    fontSize: 11,
    color: "#64748b",
  },
  flag: {
    fontSize: 10,
    color: "#94a3b8",
    background: "#334155",
    padding: "1px 4px",
    borderRadius: 3,
  },
  count: {
    fontSize: 10,
    color: "#475569",
    marginLeft: "auto",
  },
  meta: {
    fontSize: 10,
    color: "#475569",
  },
};
