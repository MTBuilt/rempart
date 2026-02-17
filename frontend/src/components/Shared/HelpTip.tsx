import { useState } from "react";
import { HelpCircle } from "lucide-react";

interface HelpTipProps {
  text: string;
  size?: number;
}

export function HelpTip({ text, size = 14 }: HelpTipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      style={styles.wrapper}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <HelpCircle size={size} style={styles.icon} />
      {show && (
        <div style={styles.tooltip}>
          <div style={styles.arrow} />
          {text}
        </div>
      )}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    cursor: "help",
    marginLeft: 4,
  },
  icon: {
    color: "#475569",
    flexShrink: 0,
  },
  tooltip: {
    position: "absolute",
    bottom: "calc(100% + 8px)",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1e293b",
    border: "1px solid #475569",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    lineHeight: 1.5,
    color: "#e2e8f0",
    whiteSpace: "normal",
    width: 240,
    zIndex: 2000,
    boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
  },
  arrow: {
    position: "absolute",
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "6px solid transparent",
    borderRight: "6px solid transparent",
    borderTop: "6px solid #475569",
  },
};
