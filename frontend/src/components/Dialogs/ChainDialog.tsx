import { useState } from "react";
import { Link2, X, ChevronDown } from "lucide-react";
import type { NftFamily, NftChain, RulesetModel } from "../../types/nftables";
import { useRulesetStore } from "../../state/rulesetStore";
import { HelpTip } from "../Shared/HelpTip";

const NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const HOOKS_BY_FAMILY: Record<NftFamily, string[]> = {
  ip: ["input", "output", "forward", "prerouting", "postrouting"],
  ip6: ["input", "output", "forward", "prerouting", "postrouting"],
  inet: ["input", "output", "forward", "prerouting", "postrouting"],
  arp: ["input", "output"],
  bridge: ["input", "output", "forward", "prerouting"],
  netdev: ["ingress", "egress"],
};

// Human-friendly descriptions for each hook
const HOOK_INFO: Record<string, { label: string; desc: string }> = {
  prerouting: {
    label: "Pré-routage",
    desc: "Paquets à l'arrivée, avant décision de routage (NAT, redirection)",
  },
  input: {
    label: "Entrée",
    desc: "Paquets destinés à cette machine (services locaux : SSH, HTTP…)",
  },
  forward: {
    label: "Transfert",
    desc: "Paquets traversant cette machine vers un autre réseau (routeur/passerelle)",
  },
  output: {
    label: "Sortie",
    desc: "Paquets générés par cette machine vers l'extérieur",
  },
  postrouting: {
    label: "Post-routage",
    desc: "Paquets au départ, après routage (masquerade, SNAT)",
  },
  ingress: {
    label: "Ingress",
    desc: "Paquets entrants sur l'interface réseau (filtrage très précoce)",
  },
  egress: {
    label: "Egress",
    desc: "Paquets sortants de l'interface réseau",
  },
};

// Auto-detect chain type from hook
function autoTypeForHook(hook: string): string {
  if (hook === "prerouting" || hook === "postrouting") return "nat";
  return "filter";
}

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
  const [showAdvanced, setShowAdvanced] = useState(
    // Show advanced if editing with non-default values
    !!editChain && (
      (editChain.prio != null && editChain.prio !== 0) ||
      (editChain.type != null && editChain.type !== autoTypeForHook(editChain.hook ?? "input"))
    ),
  );

  const model = useRulesetStore((s) => s.model);
  const updateModelFromTree = useRulesetStore((s) => s.updateModelFromTree);

  const hooks = HOOKS_BY_FAMILY[family];
  const isNetdev = family === "netdev";
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
  const needsDevice = isNetdev && (hook === "ingress" || hook === "egress");
  const canSubmit =
    nameValid &&
    !isDuplicate &&
    (!isBaseChain || (type && hook)) &&
    (!needsDevice || device.trim().length > 0);

  // When hook changes and advanced is hidden, auto-set the type
  const handleHookSelect = (h: string) => {
    setHook(h);
    if (!showAdvanced) {
      setType(autoTypeForHook(h));
    }
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const effectiveType = showAdvanced ? type : autoTypeForHook(hook);
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
          cm.chain.type = effectiveType;
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
                type: effectiveType,
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
            <div style={styles.labelRow}>
              <label style={styles.label}>Nom</label>
              <HelpTip text="Identifiant unique de la chaîne dans cette table. Utilisez un nom descriptif comme « input » ou « ssh_filter »." />
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
            <div style={styles.labelRow}>
              <label style={styles.label}>Type de chaîne</label>
              <HelpTip text="Chaîne de base : intercepte automatiquement le trafic réseau (la plus courante). Chaîne personnalisée : exécutée uniquement quand une règle y redirige via jump/goto." />
            </div>
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
                ? "Intercepte le trafic automatiquement — c'est le choix le plus courant"
                : "Appelée uniquement via jump/goto depuis d'autres chaînes"}
            </span>
          </div>

          {/* Base chain fields */}
          {isBaseChain && (
            <>
              {/* Visual hook selector */}
              <div style={styles.field}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>
                    {isNetdev ? "Point d'interception" : "Quel trafic intercepter ?"}
                  </label>
                  <HelpTip text="Choisissez à quel moment du parcours réseau cette chaîne intervient. Les paquets traversent ces points dans l'ordre du schéma." />
                </div>

                {!isNetdev ? (
                  /* Standard flow diagram for ip/ip6/inet/arp/bridge */
                  <div style={styles.flowDiagram}>
                    {/* Top row: prerouting */}
                    {hooks.includes("prerouting") && (
                      <div style={styles.flowRow}>
                        <span style={styles.flowLabel}>Internet →</span>
                        <button
                          style={{
                            ...styles.hookBtn,
                            ...(hook === "prerouting" ? styles.hookBtnActive : {}),
                          }}
                          onClick={() => handleHookSelect("prerouting")}
                        >
                          <span style={styles.hookName}>Pré-routage</span>
                          <span style={styles.hookCode}>prerouting</span>
                        </button>
                        <span style={styles.flowLabel}>→ Routage</span>
                      </div>
                    )}

                    {/* Middle row: input / forward */}
                    <div style={styles.flowRow}>
                      {hooks.includes("input") && (
                        <>
                          <span style={styles.flowLabel}>↓</span>
                          <button
                            style={{
                              ...styles.hookBtn,
                              ...(hook === "input" ? styles.hookBtnActive : {}),
                            }}
                            onClick={() => handleHookSelect("input")}
                          >
                            <span style={styles.hookName}>Entrée</span>
                            <span style={styles.hookCode}>input</span>
                          </button>
                          <span style={styles.flowLabel}>→ Ce serveur</span>
                        </>
                      )}
                      {hooks.includes("forward") && (
                        <>
                          <span style={styles.flowSep}>│</span>
                          <button
                            style={{
                              ...styles.hookBtn,
                              ...(hook === "forward" ? styles.hookBtnActive : {}),
                            }}
                            onClick={() => handleHookSelect("forward")}
                          >
                            <span style={styles.hookName}>Transfert</span>
                            <span style={styles.hookCode}>forward</span>
                          </button>
                          <span style={styles.flowLabel}>→ Autre réseau</span>
                        </>
                      )}
                    </div>

                    {/* Bottom row: output / postrouting */}
                    <div style={styles.flowRow}>
                      {hooks.includes("output") && (
                        <>
                          <span style={styles.flowLabel}>Ce serveur →</span>
                          <button
                            style={{
                              ...styles.hookBtn,
                              ...(hook === "output" ? styles.hookBtnActive : {}),
                            }}
                            onClick={() => handleHookSelect("output")}
                          >
                            <span style={styles.hookName}>Sortie</span>
                            <span style={styles.hookCode}>output</span>
                          </button>
                        </>
                      )}
                      {hooks.includes("postrouting") && (
                        <>
                          <span style={styles.flowLabel}>→</span>
                          <button
                            style={{
                              ...styles.hookBtn,
                              ...(hook === "postrouting" ? styles.hookBtnActive : {}),
                            }}
                            onClick={() => handleHookSelect("postrouting")}
                          >
                            <span style={styles.hookName}>Post-routage</span>
                            <span style={styles.hookCode}>postrouting</span>
                          </button>
                          <span style={styles.flowLabel}>→ Internet</span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Netdev: simpler ingress/egress */
                  <div style={styles.flowDiagram}>
                    <div style={styles.flowRow}>
                      <span style={styles.flowLabel}>Réseau →</span>
                      <button
                        style={{
                          ...styles.hookBtn,
                          ...(hook === "ingress" ? styles.hookBtnActive : {}),
                        }}
                        onClick={() => handleHookSelect("ingress")}
                      >
                        <span style={styles.hookName}>Ingress</span>
                        <span style={styles.hookCode}>entrée interface</span>
                      </button>
                      <span style={styles.flowSep}>⇄</span>
                      <button
                        style={{
                          ...styles.hookBtn,
                          ...(hook === "egress" ? styles.hookBtnActive : {}),
                        }}
                        onClick={() => handleHookSelect("egress")}
                      >
                        <span style={styles.hookName}>Egress</span>
                        <span style={styles.hookCode}>sortie interface</span>
                      </button>
                      <span style={styles.flowLabel}>→ Réseau</span>
                    </div>
                  </div>
                )}

                {/* Selected hook description */}
                {HOOK_INFO[hook] && (
                  <div style={styles.hookDescription}>
                    {HOOK_INFO[hook].desc}
                  </div>
                )}
              </div>

              {/* Policy */}
              <div style={styles.field}>
                <div style={styles.labelRow}>
                  <label style={styles.label}>Politique par défaut</label>
                  <HelpTip text="Que faire des paquets qui ne correspondent à aucune règle ? « Autoriser » est permissif (vous bloquez au cas par cas). « Bloquer » est sécurisé (vous autorisez au cas par cas)." />
                </div>
                <div style={styles.policyRow}>
                  <button
                    style={{
                      ...styles.policyBtn,
                      ...(policy === "accept" ? styles.policyAcceptActive : {}),
                    }}
                    onClick={() => setPolicy("accept")}
                  >
                    <div style={styles.policyBtnLabel}>Autoriser</div>
                    <div style={styles.policyBtnHint}>
                      Tout passe sauf ce que vos règles bloquent
                    </div>
                  </button>
                  <button
                    style={{
                      ...styles.policyBtn,
                      ...(policy === "drop" ? styles.policyDropActive : {}),
                    }}
                    onClick={() => setPolicy("drop")}
                  >
                    <div style={styles.policyBtnLabel}>Bloquer</div>
                    <div style={styles.policyBtnHint}>
                      Tout est bloqué sauf ce que vos règles autorisent
                    </div>
                  </button>
                </div>
              </div>

              {/* Device (netdev only) */}
              {needsDevice && (
                <div style={styles.field}>
                  <div style={styles.labelRow}>
                    <label style={styles.label}>Interface réseau</label>
                    <HelpTip text="Nom de l'interface réseau (ex: eth0, enp0s3, wlan0). Exécutez « ip link » pour voir vos interfaces." />
                  </div>
                  <input
                    style={styles.input}
                    type="text"
                    value={device}
                    onChange={(e) => setDevice(e.target.value)}
                    placeholder="eth0"
                  />
                </div>
              )}

              {/* Advanced toggle */}
              <button
                style={styles.advancedToggle}
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <ChevronDown
                  size={14}
                  style={{
                    transform: showAdvanced ? "rotate(180deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
                Options avancées
              </button>

              {showAdvanced && (
                <>
                  {/* Type */}
                  <div style={styles.field}>
                    <div style={styles.labelRow}>
                      <label style={styles.label}>Type nftables</label>
                      <HelpTip text="filter = filtrage classique (accept/drop). nat = traduction d'adresses (DNAT, SNAT, masquerade). route = modification de routage. En général, filter est correct pour input/output/forward et nat pour prerouting/postrouting." />
                    </div>
                    <select
                      style={styles.select}
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                    >
                      <option value="filter">filter — Filtrage (le plus courant)</option>
                      <option value="nat">nat — Traduction d'adresses</option>
                      <option value="route">route — Modification de routage</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div style={styles.field}>
                    <div style={styles.labelRow}>
                      <label style={styles.label}>Priorité</label>
                      <HelpTip text="Ordre d'exécution si plusieurs chaînes sont sur le même point d'accroche. 0 = standard. Négatif = s'exécute avant. Positif = s'exécute après. Laissez 0 sauf besoin spécifique." />
                    </div>
                    <input
                      style={styles.input}
                      type="number"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    />
                  </div>
                </>
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
    width: 560,
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
  // Flow diagram
  flowDiagram: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    padding: 12,
    background: "#0f172a",
    borderRadius: 8,
    border: "1px solid #1e293b",
  },
  flowRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  flowLabel: {
    fontSize: 11,
    color: "#475569",
    fontWeight: 500,
    minWidth: "fit-content",
  },
  flowSep: {
    fontSize: 11,
    color: "#334155",
    padding: "0 2px",
  },
  hookBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 1,
    padding: "6px 12px",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 6,
    cursor: "pointer",
    transition: "all 0.15s",
    minWidth: 90,
  },
  hookBtnActive: {
    background: "#1e3a5f",
    borderColor: "#3b82f6",
    boxShadow: "0 0 8px rgba(59, 130, 246, 0.25)",
  },
  hookName: {
    fontSize: 12,
    fontWeight: 600,
    color: "#e2e8f0",
  },
  hookCode: {
    fontSize: 9,
    color: "#64748b",
    fontFamily: "'JetBrains Mono', monospace",
  },
  hookDescription: {
    fontSize: 12,
    color: "#94a3b8",
    padding: "6px 10px",
    background: "#111827",
    borderRadius: 6,
    borderLeft: "3px solid #3b82f6",
  },
  // Policy buttons
  policyRow: {
    display: "flex",
    gap: 8,
  },
  policyBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "10px 14px",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 8,
    cursor: "pointer",
    textAlign: "left" as const,
    transition: "all 0.15s",
  },
  policyAcceptActive: {
    borderColor: "#22c55e",
    background: "rgba(34, 197, 94, 0.08)",
  },
  policyDropActive: {
    borderColor: "#ef4444",
    background: "rgba(239, 68, 68, 0.08)",
  },
  policyBtnLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#e2e8f0",
  },
  policyBtnHint: {
    fontSize: 11,
    color: "#64748b",
    lineHeight: 1.4,
  },
  // Advanced
  advancedToggle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 0",
    background: "transparent",
    border: "none",
    color: "#475569",
    fontSize: 12,
    cursor: "pointer",
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
