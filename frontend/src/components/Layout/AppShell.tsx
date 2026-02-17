import { useCallback, useEffect, useState } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Loader2 } from "lucide-react";
import { Header } from "./Header";
import { Dashboard } from "../Dashboard/Dashboard";
import { TableDetail } from "../Detail/TableDetail";
import { CodePanel } from "../Editor/CodePanel";
import { ValidationBar } from "../Status/ValidationBar";
import { ApplyDialog } from "../Dialogs/ApplyDialog";
import { useRulesetStore } from "../../state/rulesetStore";
import { useUiStore } from "../../state/uiStore";
import { NftWebSocket } from "../../api/websocket";

export function AppShell() {
  const [showApply, setShowApply] = useState(false);
  const isLoading = useRulesetStore((s) => s.isLoading);
  const error = useRulesetStore((s) => s.error);
  const model = useRulesetStore((s) => s.model);
  const { activeView, showCodePanel } = useUiStore();

  // Load ruleset once on mount (use getState to avoid dependency issues)
  useEffect(() => {
    useRulesetStore.getState().loadRuleset();
  }, []);

  // Connect WebSocket once on mount — independent of loading state
  useEffect(() => {
    const ws = new NftWebSocket();

    const unsubscribe = ws.subscribe((msg) => {
      if (msg.type === "ruleset_changed") {
        useRulesetStore.getState().loadRuleset();
      }
    });

    ws.connect();

    return () => {
      unsubscribe();
      ws.disconnect();
    };
  }, []);

  const handleApply = useCallback(() => {
    setShowApply(true);
  }, []);

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingCard}>
          <Loader2
            size={32}
            color="#3b82f6"
            style={{ animation: "spin 1s linear infinite" }}
          />
          <span style={styles.loadingText}>
            Chargement du ruleset...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.errorCard}>
          <span style={styles.errorText}>Erreur : {error}</span>
          <button onClick={() => useRulesetStore.getState().loadRuleset()} style={styles.retryBtn}>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const mainContent =
    activeView === "table" ? <TableDetail /> : <Dashboard />;

  return (
    <div style={styles.container}>
      <Header onApply={handleApply} applyDisabled={!model} />
      <ValidationBar />
      <div style={styles.main}>
        {showCodePanel ? (
          <PanelGroup direction="horizontal">
            <Panel defaultSize={55} minSize={30}>
              <div style={styles.scrollArea}>{mainContent}</div>
            </Panel>
            <PanelResizeHandle style={styles.resizeHandle} />
            <Panel defaultSize={45} minSize={25}>
              <div style={styles.codePanel}>
                <div style={styles.codePanelHeader}>
                  <span>Code nftables</span>
                  <span style={styles.codePanelBadge}>nft</span>
                </div>
                <div style={styles.codePanelContent}>
                  <CodePanel />
                </div>
              </div>
            </Panel>
          </PanelGroup>
        ) : (
          <div style={styles.scrollArea}>{mainContent}</div>
        )}
      </div>
      {showApply && (
        <ApplyDialog onClose={() => setShowApply(false)} />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#0c0f1a",
  },
  main: {
    flex: 1,
    overflow: "hidden",
  },
  scrollArea: {
    height: "100%",
    overflow: "auto",
  },
  codePanel: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#0f172a",
    borderLeft: "1px solid #1e293b",
  },
  codePanelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px",
    fontSize: 12,
    fontWeight: 600,
    color: "#94a3b8",
    background: "#111827",
    borderBottom: "1px solid #1e293b",
  },
  codePanelBadge: {
    fontSize: 10,
    padding: "2px 6px",
    background: "#1e293b",
    borderRadius: 4,
    color: "#64748b",
    fontFamily: "'JetBrains Mono', monospace",
  },
  codePanelContent: {
    flex: 1,
    overflow: "auto",
  },
  resizeHandle: {
    width: 3,
    background: "#1e293b",
    cursor: "col-resize",
    transition: "background 0.15s",
  },
  loadingContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    background: "#0c0f1a",
  },
  loadingCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    padding: 40,
  },
  loadingText: {
    fontSize: 14,
    color: "#94a3b8",
  },
  errorCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    padding: 40,
    background: "#111827",
    border: "1px solid #7f1d1d",
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
  },
  retryBtn: {
    padding: "8px 20px",
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
};
