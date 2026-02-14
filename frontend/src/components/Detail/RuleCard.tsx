import { useState } from "react";
import {
  Check,
  X,
  XOctagon,
  ArrowRight,
  Eye,
  Gauge,
  MessageSquare,
  Activity,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { NftRule } from "../../types/nftables";
import {
  humanizeRule,
  getVerdictLabel,
  getRuleCounter,
  getRuleLimit,
  formatBytes,
  formatPackets,
} from "../../utils/humanize";

const verdictIcons: Record<string, React.ReactNode> = {
  accept: <Check size={14} />,
  drop: <X size={14} />,
  reject: <XOctagon size={14} />,
  jump: <ArrowRight size={14} />,
  nat: <ArrowRight size={14} />,
  log: <Eye size={14} />,
  other: <ArrowRight size={14} />,
};

interface RuleCardProps {
  rule: NftRule;
  index?: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export function RuleCard({
  rule,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: RuleCardProps) {
  const [hovered, setHovered] = useState(false);
  const description = humanizeRule(rule);
  const verdict = getVerdictLabel(rule.expr);
  const counter = getRuleCounter(rule.expr);
  const limit = getRuleLimit(rule.expr);

  return (
    <div
      style={{
        ...styles.card,
        borderLeftColor: verdict.color,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.cardBody}>
        {/* Main row: icon + description + actions + verdict badge */}
        <div style={styles.mainRow}>
          <div
            style={{
              ...styles.verdictIcon,
              background: verdict.bg,
              color: verdict.color,
            }}
          >
            {verdictIcons[verdict.icon]}
          </div>
          <div style={styles.textCol}>
            <div style={styles.description}>{description}</div>
            {rule.comment && (
              <div style={styles.comment}>
                <MessageSquare size={10} />
                {rule.comment}
              </div>
            )}
          </div>

          {/* Action buttons (visible on hover) */}
          <div
            style={{
              ...styles.actions,
              opacity: hovered ? 1 : 0,
              pointerEvents: hovered ? "auto" : "none",
            }}
          >
            {onMoveUp && !isFirst && (
              <button
                style={styles.actionBtn}
                onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                title="Monter"
              >
                <ChevronUp size={14} />
              </button>
            )}
            {onMoveDown && !isLast && (
              <button
                style={styles.actionBtn}
                onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                title="Descendre"
              >
                <ChevronDown size={14} />
              </button>
            )}
            {onEdit && (
              <button
                style={{ ...styles.actionBtn, ...styles.editBtn }}
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                title="Modifier"
              >
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button
                style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                title="Supprimer"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          <div
            style={{
              ...styles.verdictBadge,
              background: verdict.bg,
              color: verdict.color,
              borderColor: verdict.color + "40",
            }}
          >
            {verdict.text}
          </div>
        </div>

        {/* Counter/limit badges */}
        {(counter || limit) && (
          <div style={styles.badges}>
            {counter && (
              <span style={styles.badge}>
                <Activity size={10} />
                {formatPackets(counter.packets)} paquets ·{" "}
                {formatBytes(counter.bytes)}
              </span>
            )}
            {limit && (
              <span style={styles.badge}>
                <Gauge size={10} />
                Limite : {limit}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    borderRadius: 8,
    border: "1px solid #1e293b",
    borderLeft: "3px solid",
    background: "#111827",
    overflow: "hidden",
    transition: "border-color 0.15s",
  },
  cardBody: {
    padding: "10px 14px",
  },
  mainRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  verdictIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    borderRadius: 6,
    flexShrink: 0,
    marginTop: 1,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  description: {
    fontSize: 13,
    color: "#e2e8f0",
    lineHeight: 1.5,
  },
  comment: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
    transition: "opacity 0.15s",
  },
  actionBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 26,
    height: 26,
    background: "transparent",
    border: "none",
    borderRadius: 4,
    color: "#64748b",
    cursor: "pointer",
    padding: 0,
    transition: "color 0.15s, background 0.15s",
  },
  editBtn: {
    color: "#64748b",
  },
  deleteBtn: {
    color: "#64748b",
  },
  verdictBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 6,
    border: "1px solid",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  badges: {
    display: "flex",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid #1e293b",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    color: "#94a3b8",
    background: "#0f172a",
    padding: "2px 8px",
    borderRadius: 4,
  },
};
