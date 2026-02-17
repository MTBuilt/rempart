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
  Pencil,
  Trash2,
} from "lucide-react";
import type { ChainModel, NftRule } from "../../types/nftables";
import { humanizeChain, humanizePolicy } from "../../utils/humanize";
import { RuleCard } from "./RuleCard";
import { RuleBuilder } from "../RuleBuilder/RuleBuilder";
import { ConfirmDialog } from "../Dialogs/ConfirmDialog";
import { useRulesetStore } from "../../state/rulesetStore";
import { reverseParseRule } from "../RuleBuilder/reverseParseRule";

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
  onEditChain?: () => void;
  onDeleteChain?: () => void;
}

export function ChainFlow({
  chainModel,
  availableChains,
  onEditChain,
  onDeleteChain,
}: ChainFlowProps) {
  const c = chainModel.chain;
  const isBaseChain = !!c.type;
  const hookLabel = isBaseChain ? humanizeChain(c) : "";
  const policyInfo = humanizePolicy(c.policy);
  const icon = hookIcons[c.hook ?? ""] ?? null;

  const [showBuilder, setShowBuilder] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [editingRule, setEditingRule] = useState<NftRule | null>(null);

  const updateModelFromTree = useRulesetStore((s) => s.updateModelFromTree);

  const handleDeleteRule = (handle: number) => {
    updateModelFromTree((model) => {
      const clone = structuredClone(model);
      for (const tm of clone.tables) {
        if (tm.table.family === c.family && tm.table.name === c.table) {
          for (const cm of tm.chains) {
            if (cm.chain.name === c.name) {
              cm.rules = cm.rules.filter((r) => r.handle !== handle);
            }
          }
        }
      }
      return clone;
    });
    setPendingDelete(null);
  };

  const handleMoveRule = (handle: number, direction: "up" | "down") => {
    updateModelFromTree((model) => {
      const clone = structuredClone(model);
      for (const tm of clone.tables) {
        if (tm.table.family === c.family && tm.table.name === c.table) {
          for (const cm of tm.chains) {
            if (cm.chain.name === c.name) {
              const idx = cm.rules.findIndex((r) => r.handle === handle);
              if (idx === -1) return clone;
              const swapIdx = direction === "up" ? idx - 1 : idx + 1;
              if (swapIdx < 0 || swapIdx >= cm.rules.length) return clone;
              [cm.rules[idx], cm.rules[swapIdx]] = [cm.rules[swapIdx], cm.rules[idx]];
            }
          }
        }
      }
      return clone;
    });
  };

  const ruleCount = chainModel.rules.length;

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
        <div style={styles.headerRight}>
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
          {onEditChain && (
            <button
              style={styles.headerActionBtn}
              title="Modifier la chaîne"
              onClick={onEditChain}
            >
              <Pencil size={13} />
            </button>
          )}
          {onDeleteChain && (
            <button
              style={{ ...styles.headerActionBtn, color: "#ef4444" }}
              title="Supprimer la chaîne"
              onClick={onDeleteChain}
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Rules flow */}
      <div style={styles.flow}>
        {ruleCount === 0 ? (
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
              <RuleCard
                rule={rule}
                index={i}
                onEdit={() => setEditingRule(rule)}
                onDelete={() => setPendingDelete(rule.handle)}
                onMoveUp={() => handleMoveRule(rule.handle, "up")}
                onMoveDown={() => handleMoveRule(rule.handle, "down")}
                isFirst={i === 0}
                isLast={i === ruleCount - 1}
              />
              {i < ruleCount - 1 && (
                <div style={styles.arrow}>
                  <ArrowDown size={14} color="#334155" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Add rule button */}
        {ruleCount > 0 && (
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
        {c.policy && ruleCount > 0 && (
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

      {/* Rule Builder modal — add mode */}
      {showBuilder && (
        <RuleBuilder
          family={c.family}
          table={c.table}
          chain={c.name}
          availableChains={availableChains}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {/* Rule Builder modal — edit mode */}
      {editingRule && (
        <RuleBuilder
          family={c.family}
          table={c.table}
          chain={c.name}
          availableChains={availableChains}
          onClose={() => setEditingRule(null)}
          editRule={editingRule}
          editInitialState={reverseParseRule(editingRule).state}
          editIsExact={reverseParseRule(editingRule).isExact}
        />
      )}

      {/* Delete confirmation */}
      {pendingDelete !== null && (
        <ConfirmDialog
          title="Supprimer cette règle"
          message="Êtes-vous sûr de vouloir supprimer cette règle ? Vous devrez appliquer les changements pour qu'ils prennent effet."
          confirmLabel="Supprimer"
          confirmColor="#ef4444"
          onConfirm={() => handleDeleteRule(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
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
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerActionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    background: "transparent",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#94a3b8",
    cursor: "pointer",
    padding: 0,
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
