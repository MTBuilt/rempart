import {
  Shield,
  LogOut,
  Play,
  RotateCcw,
  Code,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "../../state/authStore";
import { useUiStore } from "../../state/uiStore";
import { useRulesetStore } from "../../state/rulesetStore";

interface HeaderProps {
  onApply: () => void;
  applyDisabled: boolean;
}

export function Header({ onApply, applyDisabled }: HeaderProps) {
  const logout = useAuthStore((s) => s.logout);
  const {
    syncState,
    showCodePanel,
    toggleCodePanel,
    activeView,
    selectedTableId,
    navigateToDashboard,
  } = useUiStore();
  const model = useRulesetStore((s) => s.model);

  // Breadcrumb: find selected table name
  let tableName = "";
  if (activeView === "table" && selectedTableId && model) {
    const tm = model.tables.find(
      (t) =>
        `${t.table.family}:${t.table.name}` === selectedTableId,
    );
    if (tm) tableName = `${tm.table.family} ${tm.table.name}`;
  }

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.logo} onClick={navigateToDashboard}>
          <Shield size={18} color="#3b82f6" />
          <span style={styles.logoText}>Rempart</span>
        </div>
        {activeView === "table" && tableName && (
          <div style={styles.breadcrumb}>
            <ChevronRight size={14} color="#475569" />
            <span style={styles.breadcrumbText}>{tableName}</span>
          </div>
        )}
      </div>

      <div style={styles.center}>
        <SyncIndicator state={syncState} />
      </div>

      <div style={styles.right}>
        <button
          style={{
            ...styles.codeBtn,
            background: showCodePanel ? "#1e3a5f" : "transparent",
            borderColor: showCodePanel ? "#3b82f6" : "#334155",
            color: showCodePanel ? "#60a5fa" : "#94a3b8",
          }}
          onClick={toggleCodePanel}
          title="Afficher/masquer le code nftables"
        >
          <Code size={14} />
          Code
        </button>
        <button
          style={{
            ...styles.applyBtn,
            opacity: applyDisabled ? 0.5 : 1,
          }}
          onClick={onApply}
          disabled={applyDisabled}
        >
          <Play size={14} />
          Appliquer
        </button>
        <button
          style={styles.iconBtn}
          onClick={() => window.location.reload()}
          title="Recharger le ruleset"
        >
          <RotateCcw size={14} />
        </button>
        <button
          style={styles.iconBtn}
          onClick={logout}
          title="Se déconnecter"
        >
          <LogOut size={14} />
        </button>
      </div>
    </header>
  );
}

function SyncIndicator({ state }: { state: string }) {
  const color =
    state === "synced"
      ? "#22c55e"
      : state === "syncing"
        ? "#eab308"
        : "#ef4444";
  const label =
    state === "synced"
      ? "Synchronisé"
      : state === "syncing"
        ? "Synchronisation..."
        : "Erreur";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}80`,
        }}
      />
      <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    background: "#111827",
    borderBottom: "1px solid #1e293b",
    height: 48,
    flexShrink: 0,
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
  },
  logoText: {
    fontSize: 15,
    fontWeight: 700,
    color: "#f1f5f9",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  breadcrumbText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: 500,
  },
  center: {
    display: "flex",
    alignItems: "center",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  codeBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 12px",
    fontSize: 12,
    fontWeight: 600,
    border: "1px solid",
    borderRadius: 6,
    cursor: "pointer",
    background: "transparent",
  },
  applyBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 14px",
    fontSize: 12,
    fontWeight: 600,
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#64748b",
    cursor: "pointer",
  },
};
