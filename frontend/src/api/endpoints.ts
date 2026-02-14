/**
 * Typed API functions for all backend endpoints.
 */

import { get, post } from "./client";
import type {
  ApplyResponse,
  ApplyStatus,
  ParseResponse,
  RulesetResponse,
  RulesetTextResponse,
  ValidateResponse,
} from "../types/nftables";

// ── Auth ──────────────────────────────────────

export async function login(password: string) {
  return post<{ status: string; message?: string }>("/auth/login", { password });
}

export async function logout() {
  return post<{ status: string }>("/auth/logout");
}

export async function checkAuth() {
  return get<{ authenticated: boolean }>("/auth/me");
}

// ── Ruleset ───────────────────────────────────

export async function getRuleset() {
  return get<RulesetResponse>("/ruleset");
}

export async function getRulesetText() {
  return get<RulesetTextResponse>("/ruleset/text");
}

export async function parseRulesetText(text: string) {
  return post<ParseResponse>("/ruleset/parse", { text });
}

export async function validateRuleset(text: string) {
  return post<ValidateResponse>("/ruleset/validate", { text });
}

// ── Apply & Rollback ──────────────────────────

export async function applyRuleset(
  rulesetText: string,
  timeoutSeconds?: number,
) {
  return post<ApplyResponse>("/apply", {
    ruleset_text: rulesetText,
    timeout_seconds: timeoutSeconds,
  });
}

export async function confirmApply(applyId: string) {
  return post<{ status: string }>("/apply/confirm", { apply_id: applyId });
}

export async function revertApply(applyId: string) {
  return post<{ status: string }>("/apply/revert", { apply_id: applyId });
}

export async function getApplyStatus() {
  return get<ApplyStatus>("/apply/status");
}
