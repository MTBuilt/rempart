import { useState } from "react";
import {
  ArrowLeft,
  Shield,
  Database,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useRulesetStore } from "../../state/rulesetStore";
import { useUiStore } from "../../state/uiStore";
import { ChainFlow } from "./ChainFlow";
import { SetCard } from "./SetCard";
import { ChainDialog } from "../Dialogs/ChainDialog";
import { SetDialog } from "../Dialogs/SetDialog";
import { TableDialog } from "../Dialogs/TableDialog";
import { ConfirmDialog } from "../Dialogs/ConfirmDialog";
import type { NftChain, NftSet, RulesetModel } from "../../types/nftables";

const familyConfig: Record<string, { color: string; label: string }> = {
  inet: { color: "#60a5fa", label: "Internet (IPv4+IPv6)" },
  ip: { color: "#34d399", label: "IPv4" },
  ip6: { color: "#a78bfa", label: "IPv6" },
  arp: { color: "#fbbf24", label: "ARP" },
  bridge: { color: "#22d3ee", label: "Bridge" },
  netdev: { color: "#fb923c", label: "Netdev" },
};

export function TableDetail() {
  const model = useRulesetStore((s) => s.model);
  const updateModelFromTree = useRulesetStore((s) => s.updateModelFromTree);
  const { selectedTableId, navigateToDashboard, navigateToTable } =
    useUiStore();

  // Chain CRUD
  const [showChainDialog, setShowChainDialog] = useState(false);
  const [editingChain, setEditingChain] = useState<NftChain | null>(null);
  const [pendingDeleteChain, setPendingDeleteChain] = useState<number | null>(
    null,
  );

  // Set CRUD
  const [showSetDialog, setShowSetDialog] = useState(false);
  const [editingSet, setEditingSet] = useState<NftSet | null>(null);
  const [pendingDeleteSet, setPendingDeleteSet] = useState<number | null>(null);

  // Table edit
  const [showTableEdit, setShowTableEdit] = useState(false);
  const [pendingDeleteTable, setPendingDeleteTable] = useState(false);

  if (!model || !selectedTableId) return null;

  const tableModel = model.tables.find(
    (tm) => `${tm.table.family}:${tm.table.name}` === selectedTableId,
  );
  if (!tableModel) return null;

  const fc = familyConfig[tableModel.table.family] ?? familyConfig.inet;
  const totalRules = tableModel.chains.reduce(
    (n, c) => n + c.rules.length,
    0,
  );
  const family = tableModel.table.family;
  const tableName = tableModel.table.name;

  const handleDeleteChain = () => {
    if (pendingDeleteChain === null) return;
    updateModelFromTree((model: RulesetModel) => {
      const clone = structuredClone(model);
      const tm = clone.tables.find(
        (t) => t.table.family === family && t.table.name === tableName,
      );
      if (tm) {
        tm.chains = tm.chains.filter(
          (cm) => cm.chain.handle !== pendingDeleteChain,
        );
      }
      return clone;
    });
    setPendingDeleteChain(null);
  };

  const handleDeleteSet = () => {
    if (pendingDeleteSet === null) return;
    updateModelFromTree((model: RulesetModel) => {
      const clone = structuredClone(model);
      const tm = clone.tables.find(
        (t) => t.table.family === family && t.table.name === tableName,
      );
      if (tm) {
        tm.sets = tm.sets.filter((s) => s.handle !== pendingDeleteSet);
      }
      return clone;
    });
    setPendingDeleteSet(null);
  };

  const handleDeleteTable = () => {
    updateModelFromTree((model: RulesetModel) => {
      const clone = structuredClone(model);
      clone.tables = clone.tables.filter(
        (t) =>
          !(t.table.family === family && t.table.name === tableName),
      );
      return clone;
    });
    setPendingDeleteTable(false);
    navigateToDashboard();
  };

  return (
    <div style={styles.container}>
      {/* Back + header */}
      <div style={styles.headerSection}>
        <button style={styles.backBtn} onClick={navigateToDashboard}>
          <ArrowLeft size={16} />
          Retour
        </button>
        <div style={styles.titleRow}>
          <div
            style={{
              ...styles.familyBadge,
              background: fc.color + "18",
              color: fc.color,
              borderColor: fc.color + "40",
            }}
          >
            <Shield size={14} />
            {family}
          </div>
          <h1 style={styles.title}>{tableName}</h1>
          <span style={styles.subtitle}>
            {fc.label} · {tableModel.chains.length} chaîne
            {tableModel.chains.length !== 1 ? "s" : ""} · {totalRules}{" "}
            règle{totalRules !== 1 ? "s" : ""}
          </span>
          <div style={styles.tableActions}>
            <button
              style={styles.tableActionBtn}
              title="Modifier la table"
              onClick={() => setShowTableEdit(true)}
            >
              <Pencil size={14} />
            </button>
            <button
              style={{ ...styles.tableActionBtn, color: "#ef4444" }}
              title="Supprimer la table"
              onClick={() => setPendingDeleteTable(true)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Chains */}
      <div style={styles.section}>
        {tableModel.chains.map((cm) => (
          <ChainFlow
            key={cm.chain.handle}
            chainModel={cm}
            availableChains={tableModel.chains.map((c) => c.chain.name)}
            onEditChain={() => setEditingChain(cm.chain)}
            onDeleteChain={() => setPendingDeleteChain(cm.chain.handle)}
          />
        ))}
        {tableModel.chains.length === 0 && (
          <div style={styles.emptySection}>Aucune chaîne définie</div>
        )}
        <button
          style={styles.addBtn}
          onClick={() => setShowChainDialog(true)}
        >
          <Plus size={14} />
          Ajouter une chaîne
        </button>
      </div>

      {/* Sets */}
      <div style={styles.section}>
        <div style={styles.setsHeader}>
          <Database size={16} color="#8b5cf6" />
          <span style={styles.setsTitle}>
            Sets ({tableModel.sets.length})
          </span>
        </div>
        {tableModel.sets.length > 0 ? (
          <div style={styles.setsGrid}>
            {tableModel.sets.map((s) => (
              <SetCard
                key={s.handle}
                set={s}
                onEdit={() => setEditingSet(s)}
                onDelete={() => setPendingDeleteSet(s.handle)}
              />
            ))}
          </div>
        ) : (
          <div style={styles.emptySection}>Aucun set défini</div>
        )}
        <button
          style={{ ...styles.addBtn, marginTop: 12 }}
          onClick={() => setShowSetDialog(true)}
        >
          <Plus size={14} />
          Ajouter un set
        </button>
      </div>

      {/* Chain create dialog */}
      {showChainDialog && (
        <ChainDialog
          family={family}
          table={tableName}
          onClose={() => setShowChainDialog(false)}
        />
      )}

      {/* Chain edit dialog */}
      {editingChain && (
        <ChainDialog
          family={family}
          table={tableName}
          editChain={editingChain}
          onClose={() => setEditingChain(null)}
        />
      )}

      {/* Chain delete confirm */}
      {pendingDeleteChain !== null && (
        <ConfirmDialog
          title="Supprimer cette chaîne"
          message="Toutes les règles de cette chaîne seront supprimées. Vous devrez appliquer les changements pour qu'ils prennent effet."
          confirmLabel="Supprimer"
          confirmColor="#ef4444"
          onConfirm={handleDeleteChain}
          onCancel={() => setPendingDeleteChain(null)}
        />
      )}

      {/* Set create dialog */}
      {showSetDialog && (
        <SetDialog
          family={family}
          table={tableName}
          onClose={() => setShowSetDialog(false)}
        />
      )}

      {/* Set edit dialog */}
      {editingSet && (
        <SetDialog
          family={family}
          table={tableName}
          editSet={editingSet}
          onClose={() => setEditingSet(null)}
        />
      )}

      {/* Set delete confirm */}
      {pendingDeleteSet !== null && (
        <ConfirmDialog
          title="Supprimer ce set"
          message="Les règles référençant ce set pourront échouer. Vous devrez appliquer les changements pour qu'ils prennent effet."
          confirmLabel="Supprimer"
          confirmColor="#ef4444"
          onConfirm={handleDeleteSet}
          onCancel={() => setPendingDeleteSet(null)}
        />
      )}

      {/* Table edit dialog */}
      {showTableEdit && (
        <TableDialog
          editTable={tableModel.table}
          onClose={() => {
            setShowTableEdit(false);
            // If the table was renamed, update navigation
            const currentModel = useRulesetStore.getState().model;
            if (currentModel) {
              const stillExists = currentModel.tables.some(
                (t) =>
                  `${t.table.family}:${t.table.name}` === selectedTableId,
              );
              if (!stillExists) {
                // Find the table by handle (it was renamed)
                const renamed = currentModel.tables.find(
                  (t) => t.table.handle === tableModel.table.handle,
                );
                if (renamed) {
                  navigateToTable(
                    `${renamed.table.family}:${renamed.table.name}`,
                  );
                } else {
                  navigateToDashboard();
                }
              }
            }
          }}
        />
      )}

      {/* Table delete confirm */}
      {pendingDeleteTable && (
        <ConfirmDialog
          title="Supprimer cette table"
          message={`Toutes les chaînes, règles et sets de la table « ${tableName} » seront supprimés.`}
          confirmLabel="Supprimer"
          confirmColor="#ef4444"
          onConfirm={handleDeleteTable}
          onCancel={() => setPendingDeleteTable(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "20px 32px 40px",
    maxWidth: 1000,
    margin: "0 auto",
    animation: "fadeIn 0.3s ease-out",
  },
  headerSection: {
    marginBottom: 28,
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#94a3b8",
    fontSize: 13,
    cursor: "pointer",
    marginBottom: 16,
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap" as const,
  },
  familyBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    border: "1px solid",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: "#f1f5f9",
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  tableActions: {
    display: "flex",
    gap: 6,
    marginLeft: "auto",
  },
  tableActionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#94a3b8",
    cursor: "pointer",
    padding: 0,
  },
  section: {
    marginBottom: 28,
  },
  emptySection: {
    padding: "32px",
    textAlign: "center" as const,
    color: "#475569",
    fontSize: 14,
    border: "1px dashed #1e293b",
    borderRadius: 12,
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    padding: "10px",
    background: "transparent",
    border: "1px dashed #334155",
    borderRadius: 8,
    color: "#64748b",
    fontSize: 13,
    cursor: "pointer",
    marginTop: 12,
  },
  setsHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  setsTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#a78bfa",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  setsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: 12,
  },
};
