import { useRulesetStore } from "../../state/rulesetStore";
import { useUiStore } from "../../state/uiStore";
import { TableNode } from "./TableNode";
import { ChevronDown, ChevronRight, FolderTree } from "lucide-react";

export function RulesetTree() {
  const model = useRulesetStore((s) => s.model);
  const { expandedNodes, expandAll, collapseAll } = useUiStore();

  if (!model) {
    return (
      <div style={styles.empty}>
        <FolderTree size={32} color="#475569" />
        <p>No ruleset loaded</p>
      </div>
    );
  }

  if (model.tables.length === 0) {
    return (
      <div style={styles.empty}>
        <FolderTree size={32} color="#475569" />
        <p>Empty ruleset</p>
        <p style={{ fontSize: 12, color: "#64748b" }}>
          No tables defined. Edit the code panel to add tables.
        </p>
      </div>
    );
  }

  // Collect all expandable node IDs
  const allIds: string[] = [];
  for (const tm of model.tables) {
    const tid = `${tm.table.family}:${tm.table.name}`;
    allIds.push(tid);
    for (const cm of tm.chains) {
      allIds.push(`${tid}:${cm.chain.name}`);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.toolbar}>
        <button
          style={styles.toolBtn}
          onClick={() => expandAll(allIds)}
          title="Expand all"
        >
          <ChevronDown size={14} />
          Expand
        </button>
        <button
          style={styles.toolBtn}
          onClick={collapseAll}
          title="Collapse all"
        >
          <ChevronRight size={14} />
          Collapse
        </button>
      </div>
      <div style={styles.tree}>
        {model.tables.map((tm) => (
          <TableNode
            key={`${tm.table.family}:${tm.table.name}`}
            tableModel={tm}
            expanded={expandedNodes}
          />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  toolbar: {
    display: "flex",
    gap: 4,
    padding: "4px 8px",
    borderBottom: "1px solid #1e293b",
  },
  toolBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 8px",
    fontSize: 11,
    color: "#94a3b8",
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: 4,
    cursor: "pointer",
  },
  tree: {
    flex: 1,
    overflow: "auto",
    padding: "4px 0",
  },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    gap: 8,
    color: "#64748b",
    fontSize: 14,
  },
};
