import { ArrowLeft, Shield, Database } from "lucide-react";
import { useRulesetStore } from "../../state/rulesetStore";
import { useUiStore } from "../../state/uiStore";
import { ChainFlow } from "./ChainFlow";
import { SetCard } from "./SetCard";

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
  const { selectedTableId, navigateToDashboard } = useUiStore();

  if (!model || !selectedTableId) return null;

  const tableModel = model.tables.find(
    (tm) =>
      `${tm.table.family}:${tm.table.name}` === selectedTableId,
  );
  if (!tableModel) return null;

  const fc = familyConfig[tableModel.table.family] ?? familyConfig.inet;
  const totalRules = tableModel.chains.reduce(
    (n, c) => n + c.rules.length,
    0,
  );

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
            {tableModel.table.family}
          </div>
          <h1 style={styles.title}>{tableModel.table.name}</h1>
          <span style={styles.subtitle}>
            {fc.label} · {tableModel.chains.length} chaîne
            {tableModel.chains.length !== 1 ? "s" : ""} · {totalRules}{" "}
            règle{totalRules !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Chains */}
      <div style={styles.section}>
        {tableModel.chains.map((cm) => (
          <ChainFlow
            key={cm.chain.name}
            chainModel={cm}
            availableChains={tableModel.chains.map((c) => c.chain.name)}
          />
        ))}
        {tableModel.chains.length === 0 && (
          <div style={styles.emptySection}>Aucune chaîne définie</div>
        )}
      </div>

      {/* Sets */}
      {tableModel.sets.length > 0 && (
        <div style={styles.section}>
          <div style={styles.setsHeader}>
            <Database size={16} color="#8b5cf6" />
            <span style={styles.setsTitle}>
              Sets ({tableModel.sets.length})
            </span>
          </div>
          <div style={styles.setsGrid}>
            {tableModel.sets.map((s) => (
              <SetCard key={s.name} set={s} />
            ))}
          </div>
        </div>
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
