import { create } from "zustand";

interface UiState {
  // Navigation
  activeView: "dashboard" | "table";
  selectedTableId: string | null;
  showCodePanel: boolean;

  // Tree state (kept for compat)
  selectedNodeId: string | null;
  expandedNodes: Set<string>;
  syncState: "synced" | "syncing" | "error";

  // Actions
  navigateToTable: (id: string) => void;
  navigateToDashboard: () => void;
  toggleCodePanel: () => void;
  selectNode: (id: string | null) => void;
  toggleNode: (id: string) => void;
  expandAll: (ids: string[]) => void;
  collapseAll: () => void;
  setSyncState: (state: "synced" | "syncing" | "error") => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  activeView: "dashboard",
  selectedTableId: null,
  showCodePanel: false,
  selectedNodeId: null,
  expandedNodes: new Set<string>(),
  syncState: "synced",

  navigateToTable: (id) => set({ activeView: "table", selectedTableId: id }),
  navigateToDashboard: () =>
    set({ activeView: "dashboard", selectedTableId: null }),
  toggleCodePanel: () => set({ showCodePanel: !get().showCodePanel }),

  selectNode: (id) => set({ selectedNodeId: id }),
  toggleNode: (id) => {
    const expanded = new Set(get().expandedNodes);
    if (expanded.has(id)) {
      expanded.delete(id);
    } else {
      expanded.add(id);
    }
    set({ expandedNodes: expanded });
  },
  expandAll: (ids) => {
    set({ expandedNodes: new Set(ids) });
  },
  collapseAll: () => {
    set({ expandedNodes: new Set() });
  },
  setSyncState: (syncState) => set({ syncState }),
}));
