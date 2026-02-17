import { useState } from "react";
import { Database, X } from "lucide-react";
import type { NftFamily, NftSet, RulesetModel } from "../../types/nftables";
import { useRulesetStore } from "../../state/rulesetStore";
import { HelpTip } from "../Shared/HelpTip";

const NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const SET_TYPES = [
  { value: "ipv4_addr", label: "ipv4_addr — Adresse IPv4" },
  { value: "ipv6_addr", label: "ipv6_addr — Adresse IPv6" },
  { value: "inet_service", label: "inet_service — Port" },
  { value: "ether_addr", label: "ether_addr — Adresse MAC" },
  { value: "mark", label: "mark — Marque de paquet" },
  { value: "ifname", label: "ifname — Nom d'interface" },
];

const FLAG_OPTIONS = [
  { value: "interval", label: "Intervalle", hint: "Permet les plages (ex: 10.0.0.0-10.0.0.255)" },
  { value: "timeout", label: "Timeout", hint: "Éléments avec expiration automatique" },
  { value: "constant", label: "Constant", hint: "Le set ne peut pas être modifié après création" },
];

interface SetDialogProps {
  family: NftFamily;
  table: string;
  onClose: () => void;
  editSet?: NftSet;
}

function parseElements(text: string): unknown[] | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return trimmed
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function serializeElements(elem: unknown): string {
  if (Array.isArray(elem)) {
    return elem
      .map((e) => (typeof e === "object" && e !== null ? JSON.stringify(e) : String(e)))
      .join(", ");
  }
  return elem ? String(elem) : "";
}

export function SetDialog({
  family,
  table,
  onClose,
  editSet,
}: SetDialogProps) {
  const [name, setName] = useState(editSet?.name ?? "");
  const [type, setType] = useState(
    Array.isArray(editSet?.type) ? editSet.type[0] : editSet?.type ?? "ipv4_addr",
  );
  const [flags, setFlags] = useState<string[]>(editSet?.flags ?? []);
  const [timeout, setTimeout] = useState(
    editSet?.timeout != null ? String(editSet.timeout) : "",
  );
  const [size, setSize] = useState(
    editSet?.size != null ? String(editSet.size) : "",
  );
  const [autoMerge, setAutoMerge] = useState(editSet?.["auto-merge"] ?? false);
  const [elements, setElements] = useState(
    editSet?.elem != null ? serializeElements(editSet.elem) : "",
  );

  const model = useRulesetStore((s) => s.model);
  const updateModelFromTree = useRulesetStore((s) => s.updateModelFromTree);

  const nameValid = NAME_RE.test(name);
  const tm = model?.tables.find(
    (t) => t.table.family === family && t.table.name === table,
  );
  const isDuplicate =
    tm?.sets.some(
      (s) =>
        s.name === name &&
        (!editSet || s.handle !== editSet.handle),
    ) ?? false;
  const hasTimeout = flags.includes("timeout");
  const hasInterval = flags.includes("interval");
  const timeoutValid = !hasTimeout || (timeout.trim().length > 0 && !isNaN(Number(timeout)));
  const canSubmit = nameValid && !isDuplicate && timeoutValid;

  const toggleFlag = (flag: string) => {
    setFlags((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const parsedTimeout = hasTimeout ? parseInt(timeout, 10) || undefined : undefined;
    const parsedSize = size.trim() ? parseInt(size, 10) || undefined : undefined;
    const parsedElem = parseElements(elements);

    if (editSet) {
      updateModelFromTree((model: RulesetModel) => {
        const clone = structuredClone(model);
        const t = clone.tables.find(
          (t) => t.table.family === family && t.table.name === table,
        );
        if (!t) return clone;
        const s = t.sets.find((s) => s.handle === editSet.handle);
        if (!s) return clone;
        s.name = name;
        s.type = type;
        s.flags = flags.length > 0 ? flags : undefined;
        s.timeout = parsedTimeout;
        s.size = parsedSize;
        s["auto-merge"] = hasInterval ? autoMerge : undefined;
        s.elem = parsedElem;
        return clone;
      });
    } else {
      updateModelFromTree((model: RulesetModel) => {
        const clone = structuredClone(model);
        const t = clone.tables.find(
          (t) => t.table.family === family && t.table.name === table,
        );
        if (!t) return clone;
        const newSet: NftSet = {
          family,
          table,
          name,
          handle: Date.now(),
          type,
          flags: flags.length > 0 ? flags : undefined,
          timeout: parsedTimeout,
          size: parsedSize,
          "auto-merge": hasInterval ? autoMerge : undefined,
          elem: parsedElem,
        };
        t.sets.push(newSet);
        return clone;
      });
    }

    onClose();
  };

  const isEdit = !!editSet;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Database size={16} color="#8b5cf6" />
            {isEdit ? "Modifier le set" : "Nouveau set"}
          </h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Name */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Nom</label>
              <HelpTip text="Un set est une liste nommée de valeurs (IP, ports, etc.) que vous pouvez référencer dans vos règles. Ex : « blocked_ips » pour une liste d'adresses à bloquer." />
            </div>
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
              placeholder="blocked_ips"
              autoFocus
            />
            {name && !nameValid && (
              <span style={styles.error}>
                Lettres, chiffres et _ uniquement
              </span>
            )}
            {isDuplicate && (
              <span style={styles.error}>
                Un set « {name} » existe déjà dans cette table
              </span>
            )}
          </div>

          {/* Type */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Type de données</label>
              <HelpTip text="Le type de valeurs que ce set contiendra. ipv4_addr pour des adresses IP (ex: 192.168.1.1), inet_service pour des numéros de port (ex: 80, 443)." />
            </div>
            <select
              style={styles.select}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {SET_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Flags */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Options</label>
              <HelpTip text="Intervalle : permet les plages d'adresses (10.0.0.0-10.0.0.255). Timeout : les éléments expirent automatiquement après un délai. Constant : le set est figé après création." />
            </div>
            <div style={styles.flagsRow}>
              {FLAG_OPTIONS.map((opt) => {
                const active = flags.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    style={{
                      ...styles.flagChip,
                      ...(active ? styles.flagChipActive : {}),
                    }}
                    onClick={() => toggleFlag(opt.value)}
                    title={opt.hint}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timeout value (if timeout flag) */}
          {hasTimeout && (
            <div style={styles.field}>
              <label style={styles.label}>Délai d'expiration</label>
              <div style={styles.inlineRow}>
                <input
                  style={{
                    ...styles.input,
                    flex: 1,
                    borderColor: !timeoutValid ? "#ef4444" : "#334155",
                  }}
                  type="number"
                  value={timeout}
                  onChange={(e) => setTimeout(e.target.value)}
                  placeholder="3600"
                />
                <span style={styles.hint}>secondes</span>
              </div>
            </div>
          )}

          {/* Size */}
          <div style={styles.field}>
            <label style={styles.label}>Taille maximale (optionnel)</label>
            <input
              style={styles.input}
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              placeholder="65535"
            />
            <span style={styles.hint}>
              Nombre maximum d'éléments (vide = illimité)
            </span>
          </div>

          {/* Auto-merge (if interval flag) */}
          {hasInterval && (
            <div style={styles.field}>
              <label style={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={autoMerge}
                  onChange={(e) => setAutoMerge(e.target.checked)}
                  style={styles.checkbox}
                />
                Fusion automatique des intervalles
              </label>
              <span style={styles.hint}>
                Fusionne les plages adjacentes automatiquement
              </span>
            </div>
          )}

          {/* Elements */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Éléments (séparés par virgule)</label>
              <HelpTip text="Valeurs initiales du set. Vous pouvez aussi laisser vide : les règles « add @nom_set » ajouteront des éléments dynamiquement (utile pour le rate-limiting ou le ban automatique)." />
            </div>
            <textarea
              style={styles.textarea}
              value={elements}
              onChange={(e) => setElements(e.target.value)}
              placeholder="192.168.1.1, 10.0.0.0/24, 172.16.0.1"
              rows={3}
            />
            <span style={styles.hint}>
              Laissez vide pour un set dynamique (rempli par les règles)
            </span>
          </div>
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
            {isEdit ? "Enregistrer" : "Créer le set"}
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
  labelRow: {
    display: "flex",
    alignItems: "center",
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
  textarea: {
    padding: "8px 12px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#e2e8f0",
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    outline: "none",
    resize: "vertical" as const,
  },
  error: {
    fontSize: 11,
    color: "#ef4444",
  },
  hint: {
    fontSize: 11,
    color: "#64748b",
  },
  flagsRow: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap" as const,
  },
  flagChip: {
    padding: "5px 12px",
    fontSize: 12,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#94a3b8",
    cursor: "pointer",
  },
  flagChipActive: {
    background: "#1e3a5f",
    borderColor: "#3b82f6",
    color: "#60a5fa",
    fontWeight: 600,
  },
  inlineRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#e2e8f0",
    cursor: "pointer",
  },
  checkbox: {
    accentColor: "#3b82f6",
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
