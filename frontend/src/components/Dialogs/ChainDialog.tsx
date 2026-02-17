import { useState } from "react";
import { Link2, X } from "lucide-react";
import type { NftFamily, NftChain, RulesetModel } from "../../types/nftables";
import { useRulesetStore } from "../../state/rulesetStore";

const NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const HOOKS_BY_FAMILY: Record<NftFamily, string[]> = {
  ip: ["input", "output", "forward", "prerouting", "postrouting"],
  ip6: ["input", "output", "forward", "prerouting", "postrouting"],
  inet: ["input", "output", "forward", "prerouting", "postrouting"],
  arp: ["input", "output"],
  bridge: ["input", "output", "forward", "prerouting"],
  netdev: ["ingress", "egress"],
};

const HOOK_LABELS: Record<string, string> = {
  input: "input — Trafic entrant",
  output: "output — Trafic sortant",
  forward: "forward — Trafic transféré",
  prerouting: "prerouting — Avant routage",
  postrouting: "postrouting — Après routage",
  ingress: "ingress — Entrée réseau",
  egress: "egress — Sortie réseau",
};

interface ChainDialogProps {
  family: NftFamily;
  table: string;
  onClose: () => void;
  editChain?: NftChain;
}

export function ChainDialog({
  family,
  table,
  onClose,
  editChain,
}: ChainDialogProps) {
  const [name, setName] = useState(editChain?.name ?? "");
  const [isBaseChain, setIsBaseChain] = useState(!!editChain?.type);
  const [type, setType] = useState(editChain?.type ?? "filter");
  const [hook, setHook] = useState(editChain?.hook ?? HOOKS_BY_FAMILY[family][0]);
  const [priority, setPriority] = useState(String(editChain?.prio ?? 0));
  const [policy, setPolicy] = useState(editChain?.policy ?? "accept");
  const [device, setDevice] = useState(editChain?.dev ?? "");

  const model = useRulesetStore((s) => s.model);
  const updateModelFromTree = useRulesetStore((s) => s.updateModelFromTree);

  const hooks = HOOKS_BY_FAMILY[family];
  const nameValid = NAME_RE.test(name);
  const tm = model?.tables.find(
    (t) => t.table.family === family && t.table.name === table,
  );
  const isDuplicate =
    tm?.chains.some(
      (cm) =>
        cm.chain.name === name &&
        (!editChain || cm.chain.handle !== editChain.handle),
    ) ?? false;
  const needsDevice = family === "netdev" && (hook === "ingress" || hook === "egress");
  const canSubmit =
    nameValid &&
    !isDuplicate &&
    (!isBaseChain || (type && hook)) &&
    (!needsDevice || device.trim().length > 0);

  const handleSubmit = () => {
    if (!canSubmit) return;

    const prio = parseInt(priority, 10) || 0;

    if (editChain) {
      updateModelFromTree((model: RulesetModel) => {
        const clone = structuredClone(model);
        const t = clone.tables.find(
          (t) => t.table.family === family && t.table.name === table,
        );
        if (!t) return clone;
        const cm = t.chains.find((c) => c.chain.handle === editChain.handle);
        if (!cm) return clone;
        const oldName = cm.chain.name;
        cm.chain.name = name;
        if (isBaseChain) {
          cm.chain.type = type;
          cm.chain.hook = hook;
          cm.chain.prio = prio;
          cm.chain.policy = policy;
          cm.chain.dev = needsDevice ? device.trim() : undefined;
        } else {
          delete cm.chain.type;
          delete cm.chain.hook;
          delete cm.chain.prio;
          delete cm.chain.policy;
          delete cm.chain.dev;
        }
        // Update chain name reference in rules
        if (oldName !== name) {
          for (const r of cm.rules) {
            r.chain = name;
          }
        }
        return clone;
      });
    } else {
      updateModelFromTree((model: RulesetModel) => {
        const clone = structuredClone(model);
        const t = clone.tables.find(
          (t) => t.table.family === family && t.table.name === table,
        );
        if (!t) return clone;
        const newChain: NftChain = {
          family,
          table,
          name,
          handle: Date.now(),
          ...(isBaseChain
            ? {
                type,
                hook,
                prio,
                policy,
                dev: needsDevice ? device.trim() : undefined,
              }
            : {}),
        };
        t.chains.push({ chain: newChain, rules: [] });
        return clone;
      });
    }

    onClose();
  };

  const isEdit = !!editChain;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Link2 size={16} color="#f59e0b" />
            {isEdit ? "Modifier la chaîne" : "Nouvelle chaîne"}
          </h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Name */}
          <div style={styles.field}>
            <label style={styles.label}>Nom</label>
            <input
              style={{
                ...styles.input,
                borderColor:
                  name && !nameValid
                    ? "#ef4444"
                    : isDuplicate
                      ? "#f59e0b"
                      : "#334155",
              }}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="input"
              autoFocus
            />
            {name && !nameValid && (
              <span style={styles.error}>
                Lettres, chiffres et _ uniquement
              </span>
            )}
            {isDuplicate && (
              <span style={styles.error}>
                Une chaîne « {name} » existe déjà dans cette table
              </span>
            )}
          </div>

          {/* Base chain toggle */}
          <div style={styles.field}>
            <label style={styles.label}>Type de chaîne</label>
            <div style={styles.toggleRow}>
              <button
                style={{
                  ...styles.toggleBtn,
                  ...(isBaseChain ? styles.toggleActive : {}),
                }}
                onClick={() => setIsBaseChain(true)}
              >
                Chaîne de base
              </button>
              <button
                style={{
                  ...styles.toggleBtn,
                  ...(!isBaseChain ? styles.toggleActive : {}),
                }}
                onClick={() => setIsBaseChain(false)}
              >
                Chaîne personnalisée
              </button>
            </div>
            <span style={styles.hint}>
              {isBaseChain
                ? "Accrochée au kernel, traite le trafic automatiquement"
                : "Appelée uniquement via jump/goto depuis d'autres chaînes"}
            </span>
          </div>

          {/* Base chain fields */}
          {isBaseChain && (
            <>
              {/* Type */}
              <div style={styles.field}>
                <label style={styles.label}>Type</label>
                <select
                  style={styles.select}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="filter">filter — Filtrage</option>
                  <option value="nat">nat — Traduction d'adresses</option>
                  <option value="route">route — Routage</option>
                </select>
              </div>

              {/* Hook */}
              <div style={styles.field}>
                <label style={styles.label}>Point d'accroche</label>
                <select
                  style={styles.select}
                  value={hook}
                  onChange={(e) => setHook(e.target.value)}
                >
                  {hooks.map((h) => (
                    <option key={h} value={h}>
                      {HOOK_LABELS[h] ?? h}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div style={styles.field}>
                <label style={styles.label}>Priorité</label>
                <input
                  style={styles.input}
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
                <span style={styles.hint}>
                  0 = standard, négatif = avant, positif = après
                </span>
              </div>

              {/* Policy */}
              <div style={styles.field}>
                <label style={styles.label}>Politique par défaut</label>
                <select
                  style={styles.select}
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                >
                  <option value="accept">accept — Autoriser</option>
                  <option value="drop">drop — Bloquer</option>
                </select>
              </div>

              {/* Device (netdev only) */}
              {needsDevice && (
                <div style={styles.field}>
                  <label style={styles.label}>Périphérique</label>
                  <input
                    style={styles.input}
                    type="text"
                    value={device}
                    onChange={(e) => setDevice(e.target.value)}
                    placeholder="eth0"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onClose}>
            Annuler
          </button>
          <button
            style={{
              ...styles.submitBtn,
              opacity: canSubmit ? 1 : 0.4,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isEdit ? "Enregistrer" : "Créer la chaîne"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    width: 500,
    maxHeight: "85vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: "1px solid #334155",
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 15,
    fontWeight: 700,
    color: "#f1f5f9",
    margin: 0,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: 4,
  },
  body: {
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 16,
    overflowY: "auto" as const,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  select: {
    padding: "8px 12px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#e2e8f0",
    fontSize: 13,
  },
  input: {
    padding: "8px 12px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#e2e8f0",
    fontSize: 13,
    outline: "none",
  },
  error: {
    fontSize: 11,
    color: "#ef4444",
  },
  hint: {
    fontSize: 11,
    color: "#64748b",
  },
  toggleRow: {
    display: "flex",
    gap: 0,
    borderRadius: 6,
    overflow: "hidden",
    border: "1px solid #334155",
    alignSelf: "flex-start",
  },
  toggleBtn: {
    padding: "6px 14px",
    background: "#0f172a",
    border: "none",
    color: "#94a3b8",
    fontSize: 12,
    cursor: "pointer",
  },
  toggleActive: {
    background: "#1e3a5f",
    color: "#60a5fa",
    fontWeight: 600,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    padding: "12px 16px",
    borderTop: "1px solid #334155",
  },
  cancelBtn: {
    padding: "8px 16px",
    fontSize: 13,
    background: "#334155",
    color: "#e2e8f0",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  submitBtn: {
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};
