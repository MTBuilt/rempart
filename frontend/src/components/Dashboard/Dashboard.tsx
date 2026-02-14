import {
  Shield,
  Table2,
  Link2,
  FileText,
  Database,
  ArrowRight,
} from "lucide-react";
import { useRulesetStore } from "../../state/rulesetStore";
import { useUiStore } from "../../state/uiStore";
import type { RulesetModel, ChainModel } from "../../types/nftables";
import { humanizeChain, humanizePolicy } from "../../utils/humanize";

const familyConfig: Record<
  string,
  { color: string; bg: string; border: string; label: string }
> = {
  inet: {
    color: "#60a5fa",
    bg: "#0c1929",
    border: "#1e3a5f",
    label: "Internet (IPv4+IPv6)",
  },
  ip: {
    color: "#34d399",
    bg: "#0c2919",
    border: "#1e5f3a",
    label: "IPv4",
  },
  ip6: {
    color: "#a78bfa",
    bg: "#1a0c29",
    border: "#3a1e5f",
    label: "IPv6",
  },
  arp: {
    color: "#fbbf24",
    bg: "#291c0c",
    border: "#5f3a1e",
    label: "ARP",
  },
  bridge: {
    color: "#22d3ee",
    bg: "#0c2429",
    border: "#1e4a5f",
    label: "Bridge",
  },
  netdev: {
    color: "#fb923c",
    bg: "#291a0c",
    border: "#5f341e",
    label: "Netdev",
  },
};

function getStats(model: RulesetModel) {
  let chains = 0,
    rules = 0,
    sets = 0;
  for (const t of model.tables) {
    chains += t.chains.length;
    sets += t.sets.length;
    for (const c of t.chains) rules += c.rules.length;
  }
  return { tables: model.tables.length, chains, rules, sets };
}

function getChainLabel(cm: ChainModel): string {
  return cm.chain.type ? humanizeChain(cm.chain) : cm.chain.name;
}

export function Dashboard() {
  const model = useRulesetStore((s) => s.model);
  const navigateToTable = useUiStore((s) => s.navigateToTable);

  if (!model) return null;
  const stats = getStats(model);

  return (
    <div style={styles.container}>
      {/* Stats bar */}
      <div style={styles.statsRow}>
        <StatBadge
          icon={<Table2 size={20} />}
          value={stats.tables}
          label="Tables"
          color="#3b82f6"
        />
        <StatBadge
          icon={<Link2 size={20} />}
          value={stats.chains}
          label="Chaînes"
          color="#f59e0b"
        />
        <StatBadge
          icon={<FileText size={20} />}
          value={stats.rules}
          label="Règles"
          color="#22c55e"
        />
        <StatBadge
          icon={<Database size={20} />}
          value={stats.sets}
          label="Sets"
          color="#8b5cf6"
        />
      </div>

      {/* Section header */}
      <div style={styles.sectionHeader}>
        <Shield size={16} color="#64748b" />
        <span style={styles.sectionTitle}>Vos tables de firewall</span>
      </div>

      {/* Table cards grid */}
      <div style={styles.grid}>
        {model.tables.map((tm) => {
          const id = `${tm.table.family}:${tm.table.name}`;
          const fc = familyConfig[tm.table.family] ?? familyConfig.inet;
          const totalRules = tm.chains.reduce(
            (n, c) => n + c.rules.length,
            0,
          );

          return (
            <div
              key={id}
              className="card-hover"
              style={{
                ...styles.card,
                borderColor: fc.border,
                background: fc.bg,
              }}
              onClick={() => navigateToTable(id)}
            >
              {/* Card header */}
              <div style={styles.cardHeader}>
                <div
                  style={{ ...styles.familyDot, background: fc.color }}
                />
                <span
                  style={{ ...styles.familyLabel, color: fc.color }}
                >
                  {tm.table.family}
                </span>
                <span style={styles.tableName}>{tm.table.name}</span>
                <ArrowRight
                  size={14}
                  color="#475569"
                  style={{ marginLeft: "auto" }}
                />
              </div>

              {/* Chains list */}
              <div style={styles.chainsList}>
                {tm.chains.map((cm) => {
                  const label = getChainLabel(cm);
                  const policyInfo = humanizePolicy(cm.chain.policy);
                  return (
                    <div key={cm.chain.name} style={styles.chainRow}>
                      <span style={styles.chainHook}>{label}</span>
                      <span style={styles.chainRules}>
                        {cm.rules.length} règle
                        {cm.rules.length !== 1 ? "s" : ""}
                      </span>
                      {cm.chain.policy && (
                        <span
                          style={{
                            ...styles.chainPolicy,
                            color: policyInfo.color,
                          }}
                        >
                          {cm.chain.policy}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Card footer */}
              <div style={styles.cardFooter}>
                {tm.sets.length > 0 && (
                  <span style={styles.footerBadge}>
                    {tm.sets.length} set{tm.sets.length > 1 ? "s" : ""}
                  </span>
                )}
                <span style={styles.footerTotal}>
                  {totalRules} règle{totalRules !== 1 ? "s" : ""} au
                  total
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {model.tables.length === 0 && (
        <div style={styles.empty}>
          <Shield size={40} color="#1e293b" />
          <p style={styles.emptyTitle}>Aucune table</p>
          <p style={styles.emptyDesc}>
            Le ruleset est vide. Utilisez le panneau Code pour ajouter des
            tables.
          </p>
        </div>
      )}
    </div>
  );
}

function StatBadge({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div style={styles.statBadge}>
      <div style={{ color }}>{icon}</div>
      <div>
        <div style={{ ...styles.statValue, color }}>{value}</div>
        <div style={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "24px 32px",
    maxWidth: 1200,
    margin: "0 auto",
    animation: "fadeIn 0.3s ease-out",
  },
  statsRow: {
    display: "flex",
    gap: 16,
    marginBottom: 32,
  },
  statBadge: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 20px",
    background: "#111827",
    border: "1px solid #1f2937",
    borderRadius: 12,
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: 16,
  },
  card: {
    border: "1px solid",
    borderRadius: 12,
    padding: 20,
    cursor: "pointer",
    transition: "transform 0.15s, box-shadow 0.15s",
    animation: "fadeIn 0.3s ease-out",
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  familyDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
  },
  familyLabel: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  tableName: {
    fontSize: 16,
    fontWeight: 700,
    color: "#f1f5f9",
  },
  chainsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
    marginBottom: 14,
  },
  chainRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    background: "rgba(255,255,255,0.03)",
    borderRadius: 6,
    fontSize: 13,
  },
  chainHook: {
    color: "#e2e8f0",
    flex: 1,
  },
  chainRules: {
    fontSize: 11,
    color: "#64748b",
  },
  chainPolicy: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase" as const,
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.06)",
    fontSize: 12,
    color: "#64748b",
  },
  footerBadge: {
    color: "#94a3b8",
  },
  footerTotal: {
    marginLeft: "auto",
    color: "#475569",
  },
  empty: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 12,
    padding: 60,
    textAlign: "center" as const,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: "#475569",
  },
  emptyDesc: {
    fontSize: 13,
    color: "#374151",
    maxWidth: 300,
  },
};
