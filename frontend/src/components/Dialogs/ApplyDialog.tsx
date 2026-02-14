import { useState, useEffect, useCallback } from "react";
import { X, Play, RotateCcw, Check, Clock } from "lucide-react";
import { useRulesetStore } from "../../state/rulesetStore";
import * as api from "../../api/endpoints";

interface ApplyDialogProps {
  onClose: () => void;
}

type Phase = "preview" | "countdown" | "confirmed" | "reverted" | "error";

export function ApplyDialog({ onClose }: ApplyDialogProps) {
  const nftText = useRulesetStore((s) => s.nftText);
  const [phase, setPhase] = useState<Phase>("preview");
  const [timeout, setTimeoutVal] = useState(30);
  const [countdown, setCountdown] = useState(30);
  const [applyId, setApplyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Countdown timer
  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdown <= 0) {
      setPhase("reverted");
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, countdown]);

  const handleApply = useCallback(async () => {
    try {
      setError(null);
      const result = await api.applyRuleset(nftText, timeout);
      setApplyId(result.apply_id);
      setCountdown(timeout);
      setPhase("countdown");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Apply failed");
      setPhase("error");
    }
  }, [nftText, timeout]);

  const handleConfirm = useCallback(async () => {
    if (!applyId) return;
    try {
      await api.confirmApply(applyId);
      setPhase("confirmed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Confirm failed");
    }
  }, [applyId]);

  const handleRevert = useCallback(async () => {
    if (!applyId) return;
    try {
      await api.revertApply(applyId);
      setPhase("reverted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revert failed");
    }
  }, [applyId]);

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {phase === "preview" && "Apply Changes"}
            {phase === "countdown" && "Confirm Changes"}
            {phase === "confirmed" && "Changes Confirmed"}
            {phase === "reverted" && "Changes Reverted"}
            {phase === "error" && "Error"}
          </h2>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div style={styles.body}>
          {phase === "preview" && (
            <>
              <p style={styles.desc}>
                This will replace the entire ruleset atomically.
                A rollback timer will start - if you don't confirm within the
                timeout, changes are automatically reverted.
              </p>
              <div style={styles.timeoutRow}>
                <Clock size={14} />
                <label>Rollback timeout:</label>
                <select
                  value={timeout}
                  onChange={(e) => setTimeoutVal(Number(e.target.value))}
                  style={styles.select}
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds</option>
                  <option value={60}>60 seconds</option>
                  <option value={120}>120 seconds</option>
                </select>
              </div>
              <pre style={styles.preview}>
                {nftText.slice(0, 2000)}
                {nftText.length > 2000 && "\n... (truncated)"}
              </pre>
            </>
          )}

          {phase === "countdown" && (
            <div style={styles.countdownWrap}>
              <div style={styles.countdownCircle}>
                <span style={styles.countdownNum}>{countdown}</span>
                <span style={styles.countdownLabel}>seconds</span>
              </div>
              <p style={styles.countdownDesc}>
                Changes applied. Confirm within {countdown} seconds or they
                will be automatically reverted.
              </p>
            </div>
          )}

          {phase === "confirmed" && (
            <div style={styles.resultWrap}>
              <Check size={48} color="#22c55e" />
              <p>Changes confirmed and applied successfully.</p>
            </div>
          )}

          {phase === "reverted" && (
            <div style={styles.resultWrap}>
              <RotateCcw size={48} color="#eab308" />
              <p>Changes reverted. Previous ruleset restored.</p>
            </div>
          )}

          {error && <div style={styles.errorBox}>{error}</div>}
        </div>

        <div style={styles.footer}>
          {phase === "preview" && (
            <>
              <button style={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button style={styles.applyBtn} onClick={handleApply}>
                <Play size={14} />
                Apply with Rollback
              </button>
            </>
          )}
          {phase === "countdown" && (
            <>
              <button style={styles.revertBtn} onClick={handleRevert}>
                <RotateCcw size={14} />
                Revert Now
              </button>
              <button style={styles.confirmBtn} onClick={handleConfirm}>
                <Check size={14} />
                Confirm (Keep Changes)
              </button>
            </>
          )}
          {(phase === "confirmed" || phase === "reverted" || phase === "error") && (
            <button style={styles.cancelBtn} onClick={onClose}>
              Close
            </button>
          )}
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
    maxHeight: "80vh",
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
    fontSize: 16,
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
    flex: 1,
    overflow: "auto",
  },
  desc: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 1.5,
    marginBottom: 12,
  },
  timeoutRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#cbd5e1",
    marginBottom: 12,
  },
  select: {
    padding: "4px 8px",
    background: "#0f172a",
    border: "1px solid #475569",
    borderRadius: 4,
    color: "#e2e8f0",
    fontSize: 13,
  },
  preview: {
    background: "#0f172a",
    padding: 12,
    borderRadius: 6,
    fontSize: 11,
    color: "#94a3b8",
    overflow: "auto",
    maxHeight: 200,
    whiteSpace: "pre-wrap",
    fontFamily: "'JetBrains Mono', monospace",
  },
  countdownWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  countdownCircle: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 100,
    height: 100,
    borderRadius: "50%",
    border: "3px solid #eab308",
    background: "#1a1a2e",
  },
  countdownNum: {
    fontSize: 36,
    fontWeight: 700,
    color: "#eab308",
  },
  countdownLabel: {
    fontSize: 10,
    color: "#94a3b8",
  },
  countdownDesc: {
    fontSize: 14,
    color: "#cbd5e1",
    textAlign: "center" as const,
  },
  resultWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    padding: 20,
    color: "#cbd5e1",
    fontSize: 14,
  },
  errorBox: {
    background: "#7f1d1d",
    color: "#fca5a5",
    padding: "8px 12px",
    borderRadius: 6,
    fontSize: 13,
    marginTop: 8,
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
  applyBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  confirmBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  revertBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    fontSize: 13,
    background: "#dc2626",
    color: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
};
