import { useState } from "react";
import {
  ArrowDown,
  Inbox,
  Send,
  ArrowRightLeft,
  Globe,
  Router,
  Layers,
  Plus,
} from "lucide-react";
import type { ChainModel } from "../../types/nftables";
import { humanizeChain, humanizePolicy } from "../../utils/humanize";
import { RuleCard } from "./RuleCard";
import { RuleBuilder } from "../RuleBuilder/RuleBuilder";

const hookIcons: Record<string, React.ReactNode> = {
  input: <Inbox size={16} />,
  output: <Send size={16} />,
  forward: <ArrowRightLeft size={16} />,
  prerouting: <Globe size={16} />,
  postrouting: <Router size={16} />,
  ingress: <Layers size={16} />,
  egress: <Layers size={16} />,
};

interface ChainFlowProps {
  chainModel: ChainModel;
  availableChains: string[];
}

export function ChainFlow({ chainModel, availableChains }: ChainFlowProps) {
  const c = chainModel.chain;
  const isBaseChain = !!c.type;
  const hookLabel = isBaseChain ? humanizeChain(c) : "";
  const policyInfo = humanizePolicy(c.policy);
  const icon = hookIcons[c.hook ?? ""] ?? null;
  const [showBuilder, setShowBuilder] = useState(false);

  return (
    <div style={styles.container}>
      {/* Chain header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          {icon && <div style={styles.hookIcon}>{icon}</div>}
          <div>
            <div style={styles.chainName}>
              {hookLabel || c.name}
              {!isBaseChain && (
                <span style={styles.customBadge}>personnalisée</span>
              )}
            </div>
            {isBaseChain && (
              <div style={styles.chainMeta}>
                {c.type} · hook {c.hook} · priorité {c.prio ?? 0}
              </div>
            )}
          </div>
        </div>
        {c.policy && (
          <div
            style={{
              ...styles.policyBadge,
              color: policyInfo.color,
              borderColor: policyInfo.color + "40",
            }}
          >
            {policyInfo.text}
          </div>
        )}
      </div>

      {/* Rules flow */}
      <div style={styles.flow}>
        {chainModel.rules.length === 0 ? (
          <div style={styles.emptyFlow}>
            Aucune règle
            {c.policy === "drop"
              ? " — tout sera bloqué"
              : c.policy === "accept"
                ? " — tout sera autorisé"
                : ""}
          </div>
        ) : (
          chainModel.rules.map((rule, i) => (
            <div
              key={rule.handle}
              style={{
                animation: `fadeIn 0.3s ease-out ${i * 0.05}s both`,
              }}
            >
              <RuleCard rule={rule} index={i} />
              {i < chainModel.rules.length - 1 && (
                <div style={styles.arrow}>
                  <ArrowDown size={14} color="#334155" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Add rule button */}
        {chainModel.rules.length > 0 && (
          <div style={styles.arrow}>
            <ArrowDown size={14} color="#334155" />
          </div>
        )}
        <button
          style={styles.addRuleBtn}
          onClick={() => setShowBuilder(true)}
        >
          <Plus size={14} />
          Ajouter une règle
        </button>

        {/* Default policy card */}
        {c.policy && chainModel.rules.length > 0 && (
          <>
            <div style={styles.arrow}>
              <ArrowDown size={14} color="#334155" />
            </div>
            <div
              style={{
                ...styles.policyCard,
                borderColor: policyInfo.color + "40",
                background: policyInfo.color + "10",
              }}
            >
              <span
                style={{ color: policyInfo.color, fontWeight: 600 }}
              >
                Par défaut : {policyInfo.text.toLowerCase()}
              </span>
              {policyInfo.description && (
                <span style={styles.policyDesc}>
                  {policyInfo.description}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Rule Builder modal */}
      {showBuilder && (
        <RuleBuilder
          family={c.family}
          table={c.table}
          chain={c.name}
          availableChains={availableChains}
          onClose={() => setShowBuilder(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    marginBottom: 24,
    border: "1px solid #1e293b",
    borderRadius: 12,
    overflow: "hidden",
    background: "#0f172a",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 18px",
    background: "#111827",
    borderBottom: "1px solid #1e293b",
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  hookIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: 8,
    background: "#1e293b",
    color: "#f59e0b",
  },
  chainName: {
    fontSize: 15,
    fontWeight: 700,
    color: "#f1f5f9",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  customBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: "#94a3b8",
    background: "#1e293b",
    padding: "2px 8px",
    borderRadius: 4,
  },
  chainMeta: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  policyBadge: {
    fontSize: 12,
    fontWeight: 600,
    padding: "4px 12px",
    borderRadius: 6,
    border: "1px solid",
  },
  flow: {
    padding: "16px 18px",
  },
  arrow: {
    display: "flex",
    justifyContent: "center",
    padding: "4px 0",
  },
  emptyFlow: {
    padding: "20px",
    textAlign: "center" as const,
    color: "#64748b",
    fontSize: 13,
    fontStyle: "italic" as const,
  },
  policyCard: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    padding: "12px 16px",
    borderRadius: 8,
    border: "1px dashed",
    fontSize: 13,
  },
  policyDesc: {
    fontSize: 11,
    color: "#64748b",
  },
  addRuleBtn: {
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
    transition: "all 0.15s",
  },
};
