import { useState, useMemo } from "react";
import {
  X,
  Check,
  Ban,
  Link2,
  Gauge,
  Activity,
  FileX,
  ArrowRightLeft,
  Settings,
  Unlock,
  Info,
  AlertTriangle,
  Lightbulb,
  XOctagon,
  ArrowRight,
  Repeat,
  Plus,
  Pencil,
} from "lucide-react";
import type { NftFamily, NftRule } from "../../types/nftables";
import { humanizeRule, getVerdictLabel } from "../../utils/humanize";
import { serializeRule } from "../../utils/nftSerializer";
import { useRulesetStore } from "../../state/rulesetStore";
import {
  type BuilderState,
  INITIAL_STATE,
  TEMPLATES,
  KNOWN_PORTS,
  buildStatements,
  buildPreviewRule,
  generateInsights,
  canSubmit,
} from "./buildRule";

// ── Icon mapping for templates ────────────────

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  unlock: <Unlock size={16} />,
  ban: <Ban size={16} />,
  link: <Link2 size={16} />,
  gauge: <Gauge size={16} />,
  activity: <Activity size={16} />,
  "file-x": <FileX size={16} />,
  "arrow-right-left": <ArrowRightLeft size={16} />,
  settings: <Settings size={16} />,
};

// ── Action config ─────────────────────────────

const ACTIONS = [
  { key: "accept" as const, label: "Accepter", color: "#22c55e", icon: <Check size={14} /> },
  { key: "drop" as const, label: "Bloquer", color: "#ef4444", icon: <X size={14} /> },
  { key: "reject" as const, label: "Rejeter", color: "#f97316", icon: <XOctagon size={14} /> },
  { key: "jump" as const, label: "Sauter", color: "#3b82f6", icon: <ArrowRight size={14} /> },
  { key: "dnat" as const, label: "DNAT", color: "#a78bfa", icon: <ArrowRightLeft size={14} /> },
  { key: "masquerade" as const, label: "Masquerade", color: "#a78bfa", icon: <Repeat size={14} /> },
];

const CT_STATES = [
  { key: "established", label: "Établie" },
  { key: "related", label: "Liée" },
  { key: "new", label: "Nouvelle" },
  { key: "invalid", label: "Invalide" },
  { key: "untracked", label: "Non suivie" },
];

// ── Props ─────────────────────────────────────

interface RuleBuilderProps {
  family: NftFamily;
  table: string;
  chain: string;
  availableChains: string[];
  onClose: () => void;
  editRule?: NftRule;
  editInitialState?: BuilderState;
  editIsExact?: boolean;
}

// ── Component ─────────────────────────────────

export function RuleBuilder({
  family,
  table,
  chain,
  availableChains,
  onClose,
  editRule,
  editInitialState,
  editIsExact,
}: RuleBuilderProps) {
  const isEdit = !!editRule;
  const [state, setState] = useState<BuilderState>(editInitialState ?? INITIAL_STATE);
  const updateModelFromTree = useRulesetStore((s) => s.updateModelFromTree);

  // Derived
  const previewRule = useMemo(
    () => buildPreviewRule(state, family, table, chain),
    [state, family, table, chain],
  );
  const description = useMemo(() => humanizeRule(previewRule), [previewRule]);
  const nftCode = useMemo(() => serializeRule(previewRule), [previewRule]);
  const verdict = useMemo(() => getVerdictLabel(previewRule.expr), [previewRule]);
  const insights = useMemo(() => generateInsights(state), [state]);
  const valid = useMemo(() => canSubmit(state), [state]);

  // Field setter
  const set = <K extends keyof BuilderState>(key: K, value: BuilderState[K]) =>
    setState((prev) => ({ ...prev, [key]: value }));

  // Toggle CT state
  const toggleCt = (ct: string) =>
    setState((prev) => ({
      ...prev,
      ctStates: prev.ctStates.includes(ct)
        ? prev.ctStates.filter((s) => s !== ct)
        : [...prev.ctStates, ct],
    }));

  // Template select
  const selectTemplate = (key: string) => {
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (tpl) setState({ ...INITIAL_STATE, ...tpl.patch, template: key });
  };

  // Submit
  const handleSubmit = () => {
    if (!valid) return;
    const stmts = buildStatements(state);
    updateModelFromTree((model) => {
      const clone = structuredClone(model);
      for (const tm of clone.tables) {
        if (tm.table.family === family && tm.table.name === table) {
          for (const cm of tm.chains) {
            if (cm.chain.name === chain) {
              if (isEdit) {
                // Replace existing rule by handle
                const idx = cm.rules.findIndex((r) => r.handle === editRule.handle);
                if (idx !== -1) {
                  cm.rules[idx] = {
                    ...cm.rules[idx],
                    expr: stmts,
                    comment: state.comment || undefined,
                  };
                }
              } else {
                // Add new rule
                cm.rules.push({
                  family,
                  table,
                  chain,
                  handle: Date.now(),
                  expr: stmts,
                  comment: state.comment || undefined,
                });
              }
            }
          }
        }
      }
      return clone;
    });
    onClose();
  };

  // Port hint
  const portHint = state.port
    ? (() => {
        const p = parseInt(state.port.split(",")[0].trim(), 10);
        return KNOWN_PORTS[p] ? `= ${KNOWN_PORTS[p]}` : "";
      })()
    : "";

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            {isEdit ? (
              <Pencil size={16} color="#f59e0b" />
            ) : (
              <Plus size={16} color="#3b82f6" />
            )}
            <span>{isEdit ? "Modifier la règle" : "Nouvelle règle"}</span>
            <span style={styles.headerChain}>
              dans {chain}
            </span>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={styles.body}>
          {/* Inexact parse warning */}
          {isEdit && editIsExact === false && (
            <div style={styles.inexactWarning}>
              <AlertTriangle size={14} />
              <span>
                Certains éléments de la règle originale n'ont pas pu être
                mappés dans le formulaire. Ils seront perdus à
                l'enregistrement.
              </span>
            </div>
          )}

          {/* Templates */}
          <Section title="Templates rapides">
            <div style={styles.templateGrid}>
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.key}
                  style={{
                    ...styles.templateChip,
                    borderColor:
                      state.template === tpl.key ? tpl.color : "#334155",
                    color:
                      state.template === tpl.key ? tpl.color : "#94a3b8",
                  }}
                  onClick={() => selectTemplate(tpl.key)}
                  title={tpl.description}
                >
                  <span style={{ color: tpl.color }}>
                    {TEMPLATE_ICONS[tpl.iconName]}
                  </span>
                  <span>{tpl.label}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Conditions */}
          <Section title="Conditions">
            {/* Protocol + Port */}
            <div style={styles.row}>
              <Label text="Protocole">
                <select
                  style={styles.select}
                  value={state.protocol}
                  onChange={(e) =>
                    set("protocol", e.target.value as BuilderState["protocol"])
                  }
                >
                  <option value="">Tous</option>
                  <option value="tcp">TCP</option>
                  <option value="udp">UDP</option>
                  <option value="icmp">ICMP</option>
                  <option value="icmpv6">ICMPv6</option>
                </select>
              </Label>
              {(state.protocol === "tcp" || state.protocol === "udp") && (
                <>
                  <Label text="Direction">
                    <select
                      style={styles.select}
                      value={state.portType}
                      onChange={(e) =>
                        set(
                          "portType",
                          e.target.value as "dport" | "sport",
                        )
                      }
                    >
                      <option value="dport">Destination</option>
                      <option value="sport">Source</option>
                    </select>
                  </Label>
                  <Label text="Port" hint={portHint}>
                    <input
                      style={styles.input}
                      type="text"
                      placeholder="22 ou 80,443"
                      value={state.port}
                      onChange={(e) => set("port", e.target.value)}
                    />
                  </Label>
                </>
              )}
              {(state.protocol === "icmp" ||
                state.protocol === "icmpv6") && (
                <Label text="Type ICMP">
                  <select
                    style={styles.select}
                    value={state.icmpType}
                    onChange={(e) => set("icmpType", e.target.value)}
                  >
                    <option value="">Tous</option>
                    <option value="echo-request">Echo request (ping)</option>
                    <option value="echo-reply">Echo reply</option>
                    <option value="destination-unreachable">
                      Destination unreachable
                    </option>
                    <option value="time-exceeded">Time exceeded</option>
                  </select>
                </Label>
              )}
            </div>

            {/* IP source / dest */}
            <div style={styles.row}>
              <Label text="Version IP">
                <select
                  style={styles.select}
                  value={state.ipVersion}
                  onChange={(e) =>
                    set("ipVersion", e.target.value as "ip" | "ip6")
                  }
                >
                  <option value="ip">IPv4</option>
                  <option value="ip6">IPv6</option>
                </select>
              </Label>
              <Label text="IP source">
                <input
                  style={styles.input}
                  type="text"
                  placeholder="192.168.1.0/24"
                  value={state.srcIp}
                  onChange={(e) => set("srcIp", e.target.value)}
                />
              </Label>
              <Label text="IP destination">
                <input
                  style={styles.input}
                  type="text"
                  placeholder="10.0.0.1"
                  value={state.dstIp}
                  onChange={(e) => set("dstIp", e.target.value)}
                />
              </Label>
            </div>

            {/* Interfaces */}
            <div style={styles.row}>
              <Label text="Interface d'entrée">
                <input
                  style={styles.input}
                  type="text"
                  placeholder="eth0, lo..."
                  value={state.iif}
                  onChange={(e) => set("iif", e.target.value)}
                />
              </Label>
              <Label text="Interface de sortie">
                <input
                  style={styles.input}
                  type="text"
                  placeholder="eth0, wlan0..."
                  value={state.oif}
                  onChange={(e) => set("oif", e.target.value)}
                />
              </Label>
            </div>

            {/* CT State */}
            <div>
              <span style={styles.fieldLabel}>État de connexion</span>
              <div style={styles.toggleRow}>
                {CT_STATES.map((ct) => {
                  const active = state.ctStates.includes(ct.key);
                  return (
                    <button
                      key={ct.key}
                      style={{
                        ...styles.toggleChip,
                        background: active ? "#1e3a5f" : "transparent",
                        borderColor: active ? "#3b82f6" : "#334155",
                        color: active ? "#60a5fa" : "#64748b",
                      }}
                      onClick={() => toggleCt(ct.key)}
                    >
                      {ct.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Section>

          {/* Action */}
          <Section title="Action">
            <div style={styles.actionGrid}>
              {ACTIONS.map((a) => {
                const active = state.action === a.key;
                return (
                  <button
                    key={a.key}
                    style={{
                      ...styles.actionCard,
                      borderColor: active ? a.color : "#334155",
                      borderLeftWidth: 3,
                      borderLeftColor: active ? a.color : "#334155",
                      background: active ? a.color + "15" : "transparent",
                    }}
                    onClick={() => set("action", a.key)}
                  >
                    <span style={{ color: a.color }}>{a.icon}</span>
                    <span
                      style={{
                        color: active ? a.color : "#94a3b8",
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {state.action === "jump" && (
              <div style={{ marginTop: 10 }}>
                <Label text="Chaîne cible">
                  <select
                    style={styles.select}
                    value={state.jumpTarget}
                    onChange={(e) => set("jumpTarget", e.target.value)}
                  >
                    <option value="">-- Sélectionner --</option>
                    {availableChains
                      .filter((c) => c !== chain)
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                  </select>
                </Label>
              </div>
            )}
            {state.action === "dnat" && (
              <div style={{ ...styles.row, marginTop: 10 }}>
                <Label text="Adresse destination">
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="192.168.1.10"
                    value={state.dnatAddr}
                    onChange={(e) => set("dnatAddr", e.target.value)}
                  />
                </Label>
                <Label text="Port destination">
                  <input
                    style={styles.input}
                    type="text"
                    placeholder="80"
                    value={state.dnatPort}
                    onChange={(e) => set("dnatPort", e.target.value)}
                  />
                </Label>
              </div>
            )}
          </Section>

          {/* Options */}
          <Section title="Options">
            <div style={styles.optionsList}>
              {/* Counter */}
              <ToggleOption
                label="Compteur"
                desc="Compter les paquets et octets correspondants"
                active={state.enableCounter}
                onToggle={() => set("enableCounter", !state.enableCounter)}
              />
              {/* Log */}
              <ToggleOption
                label="Journalisation"
                desc="Enregistrer les paquets dans le journal système"
                active={state.enableLog}
                onToggle={() => set("enableLog", !state.enableLog)}
              />
              {state.enableLog && (
                <div style={{ ...styles.row, paddingLeft: 16 }}>
                  <Label text="Préfixe">
                    <input
                      style={styles.input}
                      type="text"
                      placeholder="DROP: "
                      value={state.logPrefix}
                      onChange={(e) => set("logPrefix", e.target.value)}
                    />
                  </Label>
                  <Label text="Niveau">
                    <select
                      style={styles.select}
                      value={state.logLevel}
                      onChange={(e) => set("logLevel", e.target.value)}
                    >
                      <option value="emerg">Emergency</option>
                      <option value="alert">Alert</option>
                      <option value="crit">Critical</option>
                      <option value="err">Error</option>
                      <option value="warn">Warning</option>
                      <option value="notice">Notice</option>
                      <option value="info">Info</option>
                      <option value="debug">Debug</option>
                    </select>
                  </Label>
                </div>
              )}
              {/* Rate limit */}
              <ToggleOption
                label="Limite de débit"
                desc="Limiter le nombre de paquets par intervalle"
                active={state.enableLimit}
                onToggle={() => set("enableLimit", !state.enableLimit)}
              />
              {state.enableLimit && (
                <div style={{ ...styles.row, paddingLeft: 16 }}>
                  <Label text="Taux">
                    <input
                      style={{ ...styles.input, width: 70 }}
                      type="number"
                      min={1}
                      value={state.limitRate}
                      onChange={(e) =>
                        set("limitRate", parseInt(e.target.value, 10) || 1)
                      }
                    />
                  </Label>
                  <Label text="Par">
                    <select
                      style={styles.select}
                      value={state.limitPer}
                      onChange={(e) =>
                        set(
                          "limitPer",
                          e.target.value as BuilderState["limitPer"],
                        )
                      }
                    >
                      <option value="second">Seconde</option>
                      <option value="minute">Minute</option>
                      <option value="hour">Heure</option>
                      <option value="day">Jour</option>
                    </select>
                  </Label>
                  <Label text="Burst">
                    <input
                      style={{ ...styles.input, width: 70 }}
                      type="number"
                      min={0}
                      placeholder="0"
                      value={state.limitBurst || ""}
                      onChange={(e) =>
                        set(
                          "limitBurst",
                          parseInt(e.target.value, 10) || 0,
                        )
                      }
                    />
                  </Label>
                </div>
              )}
            </div>
            {/* Comment */}
            <div style={{ marginTop: 10 }}>
              <Label text="Commentaire">
                <input
                  style={styles.input}
                  type="text"
                  placeholder="Description optionnelle de la règle"
                  value={state.comment}
                  onChange={(e) => set("comment", e.target.value)}
                />
              </Label>
            </div>
          </Section>

          {/* Preview + Insights */}
          <Section title="Aperçu">
            <div style={styles.previewBox}>
              <div style={styles.previewDesc}>
                <div
                  style={{
                    ...styles.previewVerdictDot,
                    background: verdict.color,
                  }}
                />
                <span>{description || "Règle vide"}</span>
              </div>
              <div style={styles.previewCode}>{nftCode || "..."}</div>
            </div>
            {insights.length > 0 && (
              <div style={styles.insightsList}>
                {insights.map((ins, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.insightCard,
                      borderLeftColor:
                        ins.type === "warning"
                          ? "#eab308"
                          : ins.type === "tip"
                            ? "#22c55e"
                            : "#3b82f6",
                      background:
                        ins.type === "warning"
                          ? "#422006"
                          : ins.type === "tip"
                            ? "#052e16"
                            : "#172554",
                    }}
                  >
                    <span
                      style={{
                        color:
                          ins.type === "warning"
                            ? "#fbbf24"
                            : ins.type === "tip"
                              ? "#4ade80"
                              : "#60a5fa",
                        flexShrink: 0,
                      }}
                    >
                      {ins.type === "warning" ? (
                        <AlertTriangle size={14} />
                      ) : ins.type === "tip" ? (
                        <Lightbulb size={14} />
                      ) : (
                        <Info size={14} />
                      )}
                    </span>
                    <span style={styles.insightText}>{ins.message}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Footer ── */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Annuler
          </button>
          <button
            style={{
              ...styles.submitBtn,
              opacity: valid ? 1 : 0.5,
            }}
            disabled={!valid}
            onClick={handleSubmit}
          >
            {isEdit ? <Check size={14} /> : <Plus size={14} />}
            {isEdit ? "Enregistrer les modifications" : "Ajouter la règle"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.section}>
      <div style={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Label({
  text,
  hint,
  children,
}: {
  text: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>
        {text}
        {hint && <span style={styles.fieldHint}> {hint}</span>}
      </span>
      {children}
    </div>
  );
}

function ToggleOption({
  label,
  desc,
  active,
  onToggle,
}: {
  label: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button style={styles.optionRow} onClick={onToggle}>
      <div
        style={{
          ...styles.optionToggle,
          background: active ? "#3b82f6" : "#334155",
        }}
      >
        <div
          style={{
            ...styles.optionToggleDot,
            transform: active ? "translateX(14px)" : "translateX(0)",
          }}
        />
      </div>
      <div>
        <div
          style={{
            fontSize: 13,
            color: active ? "#e2e8f0" : "#94a3b8",
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        <div style={{ fontSize: 11, color: "#475569" }}>{desc}</div>
      </div>
    </button>
  );
}

// ── Styles ─────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  dialog: {
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 12,
    width: 680,
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
    animation: "fadeIn 0.2s ease-out",
  },

  // Header
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 18px",
    borderBottom: "1px solid #334155",
  },
  headerTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    color: "#f1f5f9",
  },
  headerChain: {
    fontSize: 12,
    fontWeight: 400,
    color: "#64748b",
  },
  closeBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 28,
    height: 28,
    background: "transparent",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    borderRadius: 4,
  },

  // Body
  body: {
    flex: 1,
    overflow: "auto",
    padding: "0 18px 18px",
  },

  // Inexact warning
  inexactWarning: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "10px 14px",
    marginTop: 12,
    background: "#422006",
    border: "1px solid #92400e",
    borderRadius: 8,
    fontSize: 12,
    color: "#fbbf24",
    lineHeight: 1.5,
  },

  // Sections
  section: {
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    marginBottom: 10,
  },

  // Templates
  templateGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 6,
  },
  templateChip: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 10px",
    background: "transparent",
    border: "1px solid",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "all 0.15s",
  },

  // Form
  row: {
    display: "flex",
    gap: 10,
    marginBottom: 8,
  },
  field: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#94a3b8",
  },
  fieldHint: {
    fontWeight: 400,
    color: "#3b82f6",
    fontSize: 10,
  },
  select: {
    padding: "6px 10px",
    background: "#0f172a",
    border: "1px solid #475569",
    borderRadius: 6,
    color: "#e2e8f0",
    fontSize: 13,
    outline: "none",
  },
  input: {
    padding: "6px 10px",
    background: "#0f172a",
    border: "1px solid #475569",
    borderRadius: 6,
    color: "#e2e8f0",
    fontSize: 13,
    outline: "none",
    width: "100%",
  },

  // CT state toggles
  toggleRow: {
    display: "flex",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap" as const,
  },
  toggleChip: {
    padding: "4px 10px",
    border: "1px solid",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    background: "transparent",
    transition: "all 0.15s",
  },

  // Action
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 6,
  },
  actionCard: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    background: "transparent",
    border: "1px solid",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    transition: "all 0.15s",
    borderLeftWidth: 3,
    borderLeftStyle: "solid" as const,
  },

  // Options
  optionsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
  },
  optionRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 8px",
    background: "transparent",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    textAlign: "left" as const,
    width: "100%",
  },
  optionToggle: {
    width: 30,
    height: 16,
    borderRadius: 8,
    position: "relative" as const,
    flexShrink: 0,
    transition: "background 0.15s",
  },
  optionToggleDot: {
    position: "absolute" as const,
    top: 2,
    left: 2,
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "white",
    transition: "transform 0.15s",
  },

  // Preview
  previewBox: {
    border: "1px solid #334155",
    borderRadius: 8,
    overflow: "hidden",
    marginBottom: 10,
  },
  previewDesc: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    fontSize: 13,
    color: "#e2e8f0",
    background: "#111827",
  },
  previewVerdictDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
  },
  previewCode: {
    padding: "8px 14px",
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    color: "#94a3b8",
    background: "#0f172a",
    borderTop: "1px solid #1e293b",
  },

  // Insights
  insightsList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 6,
  },
  insightCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 6,
    borderLeft: "3px solid",
    fontSize: 12,
  },
  insightText: {
    color: "#cbd5e1",
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    padding: "12px 18px",
    borderTop: "1px solid #334155",
  },
  cancelBtn: {
    padding: "7px 16px",
    background: "transparent",
    border: "1px solid #475569",
    borderRadius: 6,
    color: "#94a3b8",
    fontSize: 13,
    cursor: "pointer",
  },
  submitBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 18px",
    background: "#22c55e",
    border: "none",
    borderRadius: 6,
    color: "white",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};
