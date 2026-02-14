import { ChevronDown, ChevronRight, Link } from "lucide-react";
import type { ChainModel } from "../../types/nftables";
import { useUiStore } from "../../state/uiStore";
import { RuleNode } from "./RuleNode";

interface ChainNodeProps {
  chainModel: ChainModel;
  tableId: string;
  expanded: Set<string>;
}

export function ChainNode({ chainModel, tableId, expanded }: ChainNodeProps) {
  const { toggleNode, selectNode, selectedNodeId } = useUiStore();
  const c = chainModel.chain;
  const nodeId = `${tableId}:${c.name}`;
  const isExpanded = expanded.has(nodeId);
  const isSelected = selectedNodeId === nodeId;

  const policyColor =
    c.policy === "accept" ? "#22c55e" : c.policy === "drop" ? "#ef4444" : "#94a3b8";

  return (
    <div>
      <div
        style={{
          ...styles.row,
          background: isSelected ? "#1e3a5f" : "transparent",
        }}
        onClick={() => {
          toggleNode(nodeId);
          selectNode(nodeId);
        }}
      >
        {isExpanded ? (
          <ChevronDown size={14} color="#64748b" />
        ) : (
          <ChevronRight size={14} color="#64748b" />
        )}
        <Link size={14} color="#f59e0b" />
        <span style={styles.name}>{c.name}</span>
        {c.type && (
          <span style={styles.meta}>
            {c.type} hook {c.hook} prio {c.prio ?? 0}
          </span>
        )}
        {c.policy && (
          <span style={{ ...styles.policy, color: policyColor }}>
            {c.policy}
          </span>
        )}
        <span style={styles.count}>{chainModel.rules.length} rules</span>
      </div>

      {isExpanded && (
        <div style={styles.children}>
          {chainModel.rules.map((rule) => (
            <RuleNode
              key={`rule:${rule.handle}`}
              rule={rule}
              chainId={nodeId}
            />
          ))}
          {chainModel.rules.length === 0 && (
            <div style={styles.emptyChain}>No rules</div>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: 13,
    userSelect: "none",
  },
  name: {
    color: "#fbbf24",
    fontWeight: 600,
  },
  meta: {
    fontSize: 11,
    color: "#64748b",
  },
  policy: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase" as const,
  },
  count: {
    fontSize: 10,
    color: "#475569",
    marginLeft: "auto",
  },
  children: {
    paddingLeft: 16,
  },
  emptyChain: {
    padding: "4px 24px",
    fontSize: 12,
    color: "#475569",
    fontStyle: "italic",
  },
};
