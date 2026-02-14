import { create } from "zustand";
import type { RulesetModel } from "../types/nftables";
import * as api from "../api/endpoints";
import { serializeRuleset } from "../utils/nftSerializer";

export type EditOrigin = "tree" | "code" | "server";

interface RulesetState {
  // The hierarchical model
  model: RulesetModel | null;
  // The nft text (what the code panel shows)
  nftText: string;
  // Source of the last edit (prevents sync loops)
  lastEditOrigin: EditOrigin | null;
  // Sequence number for stale response detection
  seq: number;
  // Validation
  validationErrors: string[];
  isValidating: boolean;
  // Loading
  isLoading: boolean;
  error: string | null;

  // Actions
  loadRuleset: () => Promise<void>;
  updateModelFromTree: (
    updater: (model: RulesetModel) => RulesetModel,
  ) => void;
  updateTextFromCode: (text: string) => void;
  setModelFromServer: (model: RulesetModel, text: string) => void;
  setValidationErrors: (errors: string[]) => void;
  setNftText: (text: string, origin: EditOrigin) => void;
}

export const useRulesetStore = create<RulesetState>((set, get) => ({
  model: null,
  nftText: "",
  lastEditOrigin: null,
  seq: 0,
  validationErrors: [],
  isValidating: false,
  isLoading: false,
  error: null,

  loadRuleset: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.getRuleset();
      const model = response.model;
      const text = serializeRuleset(model);
      set({
        model,
        nftText: text,
        lastEditOrigin: "server",
        isLoading: false,
        validationErrors: [],
      });
    } catch (e) {
      set({
        isLoading: false,
        error: e instanceof Error ? e.message : "Failed to load ruleset",
      });
    }
  },

  updateModelFromTree: (updater) => {
    const { model } = get();
    if (!model) return;
    const newModel = updater(model);
    const text = serializeRuleset(newModel);
    set({
      model: newModel,
      nftText: text,
      lastEditOrigin: "tree",
      seq: get().seq + 1,
      validationErrors: [],
    });
  },

  updateTextFromCode: (text: string) => {
    set({
      nftText: text,
      lastEditOrigin: "code",
      seq: get().seq + 1,
    });
  },

  setModelFromServer: (model: RulesetModel, text: string) => {
    set({
      model,
      nftText: text,
      lastEditOrigin: "server",
      validationErrors: [],
    });
  },

  setNftText: (text: string, origin: EditOrigin) => {
    set({ nftText: text, lastEditOrigin: origin });
  },

  setValidationErrors: (errors: string[]) => {
    set({ validationErrors: errors, isValidating: false });
  },
}));
