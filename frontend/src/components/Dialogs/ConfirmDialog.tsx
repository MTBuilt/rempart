import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  confirmColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmColor = "#ef4444",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            <AlertTriangle size={16} color={confirmColor} />
            {title}
          </h2>
          <button style={styles.closeBtn} onClick={onCancel}>
            <X size={16} />
          </button>
        </div>
        <div style={styles.body}>
          <p style={styles.message}>{message}</p>
        </div>
        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            Annuler
          </button>
          <button
            style={{ ...styles.confirmBtn, background: confirmColor }}
            onClick={onConfirm}
          >
            {confirmLabel}
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
    width: 420,
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
  },
  message: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 1.6,
    margin: 0,
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
  confirmBtn: {
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};
