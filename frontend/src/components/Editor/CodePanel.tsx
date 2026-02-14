import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, lineNumbers, highlightActiveLine, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, foldGutter, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { oneDark } from "@codemirror/theme-one-dark";
import { nftLanguage } from "./NftLanguage";
import { useRulesetStore } from "../../state/rulesetStore";
import { syncEngine } from "../../state/syncEngine";

export function CodePanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const nftText = useRulesetStore((s) => s.nftText);
  const lastEditOrigin = useRulesetStore((s) => s.lastEditOrigin);

  // Create the editor once
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        const text = update.state.doc.toString();
        syncEngine.onCodeChange(text);
      }
    });

    const state = EditorState.create({
      doc: nftText,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        bracketMatching(),
        highlightSelectionMatches(),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
        nftLanguage,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        oneDark,
        updateListener,
        EditorView.theme({
          "&": { height: "100%", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" },
          ".cm-gutters": { fontFamily: "'JetBrains Mono', 'Cascadia Code', monospace" },
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external changes (from tree edits or server) into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    // Only update if the change came from outside the code editor
    if (lastEditOrigin === "code") return;

    const currentText = view.state.doc.toString();
    if (currentText !== nftText) {
      view.dispatch({
        changes: { from: 0, to: currentText.length, insert: nftText },
      });
    }
  }, [nftText, lastEditOrigin]);

  return <div ref={containerRef} style={{ height: "100%" }} />;
}
