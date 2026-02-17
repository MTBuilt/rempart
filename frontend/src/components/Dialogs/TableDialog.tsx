import { useState } from "react";
import { Table2, X } from "lucide-react";
import type { NftFamily, NftTable, RulesetModel } from "../../types/nftables";
import { useRulesetStore } from "../../state/rulesetStore";
import { HelpTip } from "../Shared/HelpTip";

const FAMILIES: { value: NftFamily; label: string; rec?: boolean }[] = [
  { value: "inet", label: "inet — IPv4 + IPv6 (recommandé)", rec: true },
  { value: "ip", label: "ip — IPv4 uniquement" },
  { value: "ip6", label: "ip6 — IPv6 uniquement" },
  { value: "arp", label: "arp — Protocole ARP" },
  { value: "bridge", label: "bridge — Pont réseau (L2)" },
  { value: "netdev", label: "netdev — Filtrage par interface" },
];

const NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

interface TableDialogProps {
  onClose: () => void;
  editTable?: NftTable;
}

export function TableDialog({ onClose, editTable }: TableDialogProps) {
  const [family, setFamily] = useState<NftFamily>(editTable?.family ?? "inet");
  const [name, setName] = useState(editTable?.name ?? "");
  const [dormant, setDormant] = useState(
    editTable?.flags?.includes("dormant") ?? false,
  );

  const model = useRulesetStore((s) => s.model);
  const updateModelFromTree = useRulesetStore((s) => s.updateModelFromTree);

  const nameValid = NAME_RE.test(name);
  const isDuplicate =
    model?.tables.some(
      (t) =>
        t.table.family === family &&
        t.table.name === name &&
        (!editTable ||
          t.table.family !== editTable.family ||
          t.table.name !== editTable.name),
    ) ?? false;

  const canSubmit = nameValid && !isDuplicate;

  const handleSubmit = () => {
    if (!canSubmit) return;

    const flags = dormant ? ["dormant"] : undefined;

    if (editTable) {
      updateModelFromTree((model: RulesetModel) => {
        const clone = structuredClone(model);
        const tm = clone.tables.find(
          (t) =>
            t.table.family === editTable.family &&
            t.table.name === editTable.name,
        );
        if (!tm) return clone;
        tm.table.family = family;
        tm.table.name = name;
        tm.table.flags = flags;
        // Propagate family/name to all children
        for (const cm of tm.chains) {
          cm.chain.family = family;
          cm.chain.table = name;
          for (const r of cm.rules) {
            r.family = family;
            r.table = name;
          }
        }
        for (const s of tm.sets) {
          s.family = family;
          s.table = name;
        }
        for (const m of tm.maps) {
          m.family = family;
          m.table = name;
        }
        for (const ft of tm.flowtables) {
          ft.family = family;
          ft.table = name;
        }
        for (const c of tm.counters) {
          c.family = family;
          c.table = name;
        }
        return clone;
      });
    } else {
      updateModelFromTree((model: RulesetModel) => {
        const clone = structuredClone(model);
        clone.tables.push({
          table: { family, name, handle: Date.now(), flags },
          chains: [],
          sets: [],
          maps: [],
          flowtables: [],
          counters: [],
          quotas: [],
          limits: [],
          ctHelpers: [],
        });
        return clone;
      });
    }

    onClose();
  };

  const isEdit = !!editTable;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            <Table2 size={16} color="#3b82f6" />
            {isEdit ? "Modifier la table" : "Nouvelle table"}
          </h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Family */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Famille</label>
              <HelpTip text="La famille détermine quels types de paquets cette table peut traiter. « inet » est le choix le plus courant : il gère à la fois IPv4 et IPv6 dans une seule table." />
            </div>
            <select
              style={styles.select}
              value={family}
              onChange={(e) => setFamily(e.target.value as NftFamily)}
            >
              {FAMILIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Name */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Nom</label>
              <HelpTip text="Un nom descriptif pour votre table, par exemple « filter » pour du filtrage ou « nat » pour de la traduction d'adresses. Le nom doit être unique dans cette famille." />
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
              placeholder="filter"
              autoFocus
            />
            {name && !nameValid && (
              <span style={styles.error}>
                Lettres, chiffres et _ uniquement
              </span>
            )}
            {isDuplicate && (
              <span style={styles.error}>
                Une table {family} {name} existe déjà
              </span>
            )}
          </div>

          {/* Dormant flag */}
          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label style={styles.label}>Options</label>
              <HelpTip text="Une table dormante est chargée en mémoire mais n'intercepte aucun trafic. Utile pour préparer des règles sans les activer immédiatement." />
            </div>
            <button
              style={{
                ...styles.chip,
                ...(dormant ? styles.chipActive : {}),
              }}
              onClick={() => setDormant(!dormant)}
            >
              Dormante
            </button>
            <span style={styles.hint}>
              Une table dormante est inactive jusqu'à activation explicite
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
            {isEdit ? "Enregistrer" : "Créer la table"}
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
    width: 480,
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
  error: {
    fontSize: 11,
    color: "#ef4444",
  },
  hint: {
    fontSize: 11,
    color: "#64748b",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: "4px 12px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#94a3b8",
    fontSize: 12,
    cursor: "pointer",
  },
  chipActive: {
    background: "#1e3a5f",
    borderColor: "#3b82f6",
    color: "#60a5fa",
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
