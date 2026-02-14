import { ChevronDown, ChevronRight, Table2 } from "lucide-react";
import type { TableModel } from "../../types/nftables";
import { useUiStore } from "../../state/uiStore";
import { ChainNode } from "./ChainNode";
import { SetNode } from "./SetNode";

interface TableNodeProps {
  tableModel: TableModel;
  expanded: Set<string>;
}

export function TableNode({ tableModel, expanded }: TableNodeProps) {
  const { toggleNode, selectNode, selectedNodeId } = useUiStore();
  const t = tableModel.table;
  const nodeId = `${t.family}:${t.name}`;
  const isExpanded = expanded.has(nodeId);
  const isSelected = selectedNodeId === nodeId;

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
        <Table2 size={14} color="#3b82f6" />
        <span style={styles.family}>{t.family}</span>
        <span style={styles.name}>{t.name}</span>
        {t.flags?.map((f) => (
          <span key={f} style={styles.flag}>
            {f}
          </span>
        ))}
      </div>

      {isExpanded && (
        <div style={styles.children}>
          {tableModel.sets.map((s) => (
            <SetNode key={`set:${s.name}`} set={s} tableId={nodeId} />
          ))}
          {tableModel.chains.map((cm) => (
            <ChainNode
              key={`chain:${cm.chain.name}`}
              chainModel={cm}
              tableId={nodeId}
              expanded={expanded}
            />
          ))}
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
  family: {
    color: "#a78bfa",
    fontWeight: 600,
    fontSize: 12,
  },
  name: {
    color: "#e2e8f0",
    fontWeight: 600,
  },
  flag: {
    fontSize: 10,
    color: "#94a3b8",
    background: "#334155",
    padding: "1px 4px",
    borderRadius: 3,
  },
  children: {
    paddingLeft: 16,
  },
};
