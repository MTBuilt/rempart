/**
 * Bidirectional sync coordinator between Tree (GUI) and Code (CodeMirror).
 *
 * - Tree → Code: client-side serialization (fast, 300ms debounce)
 * - Code → Tree: backend parsing via POST /api/ruleset/parse (500ms debounce)
 * - Origin tracking prevents infinite sync loops
 * - Sequence numbers detect stale parse responses
 */

import { useRulesetStore } from "./rulesetStore";
import { useUiStore } from "./uiStore";
import * as api from "../api/endpoints";

class SyncEngine {
  private codeToTreeTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;


  /**
   * Called when code panel text changes.
   * Debounces, then sends to backend for parsing.
   */
  onCodeChange(text: string): void {
    if (this.isSyncing) return;

    const store = useRulesetStore.getState();
    store.updateTextFromCode(text);

    if (this.codeToTreeTimer) clearTimeout(this.codeToTreeTimer);

    const seq = store.seq + 1;

    useUiStore.getState().setSyncState("syncing");

    this.codeToTreeTimer = setTimeout(async () => {
      try {
        const result = await api.parseRulesetText(text);
        const currentSeq = useRulesetStore.getState().seq;

        // Discard stale responses
        if (seq < currentSeq) {
          return;
        }

        if (result.valid) {
          useRulesetStore.getState().setValidationErrors([]);
          useUiStore.getState().setSyncState("synced");
        } else {
          useRulesetStore.getState().setValidationErrors(result.errors);
          useUiStore.getState().setSyncState("error");
        }
      } catch {
        useUiStore.getState().setSyncState("error");
      }
    }, 500);
  }

  /**
   * Called when the tree model changes.
   * The store already serializes model → text synchronously.
   * We just update the sync state.
   */
  onTreeChange(): void {
    useUiStore.getState().setSyncState("synced");
  }

  destroy(): void {
    if (this.codeToTreeTimer) clearTimeout(this.codeToTreeTimer);
  }
}

// Singleton instance
export const syncEngine = new SyncEngine();
