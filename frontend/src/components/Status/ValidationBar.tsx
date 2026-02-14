import { AlertTriangle } from "lucide-react";
import { useRulesetStore } from "../../state/rulesetStore";

export function ValidationBar() {
  const errors = useRulesetStore((s) => s.validationErrors);

  if (errors.length === 0) return null;

  return (
    <div style={styles.bar}>
      <AlertTriangle size={14} />
      <span style={styles.label}>Validation errors:</span>
      {errors.map((err, i) => (
        <span key={i} style={styles.error}>
          {err}
        </span>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "4px 12px",
    background: "#7f1d1d",
    color: "#fca5a5",
    fontSize: 12,
    flexWrap: "wrap",
  },
  label: {
    fontWeight: 600,
  },
  error: {
    background: "#991b1b",
    padding: "2px 6px",
    borderRadius: 3,
  },
};
