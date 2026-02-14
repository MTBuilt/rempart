/**
 * TypeScript interfaces mirroring the backend Pydantic models.
 * These represent the nftables ruleset structure from libnftables-json.
 */

export type NftFamily = "ip" | "ip6" | "inet" | "arp" | "bridge" | "netdev";

// ──────────────────────────────────────────────
// Core objects
// ──────────────────────────────────────────────

export interface NftTable {
  family: NftFamily;
  name: string;
  handle: number;
  flags?: string[];
}

export interface NftChain {
  family: NftFamily;
  table: string;
  name: string;
  handle: number;
  type?: string;
  hook?: string;
  prio?: number;
  policy?: string;
  dev?: string;
}

export interface NftRule {
  family: NftFamily;
  table: string;
  chain: string;
  handle: number;
  expr: NftStatement[];
  index?: number;
  comment?: string;
}

export interface NftSet {
  family: NftFamily;
  table: string;
  name: string;
  handle: number;
  type: string | string[];
  policy?: string;
  flags?: string[];
  elem?: unknown;
  timeout?: number;
  "gc-interval"?: number;
  size?: number;
  "auto-merge"?: boolean;
}

export interface NftMap {
  family: NftFamily;
  table: string;
  name: string;
  handle: number;
  type: string | string[];
  map: string;
  policy?: string;
  flags?: string[];
  elem?: unknown;
  size?: number;
}

export interface NftFlowtable {
  family: NftFamily;
  table: string;
  name: string;
  handle: number;
  hook: string;
  prio: number;
  dev: string | string[];
}

export interface NftCounter {
  family: NftFamily;
  table: string;
  name: string;
  handle: number;
  packets: number;
  bytes: number;
}

// ──────────────────────────────────────────────
// Statements & Expressions (rule contents)
// ──────────────────────────────────────────────

// Statements are the individual actions/matches inside a rule
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NftStatement = Record<string, any>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NftExpression = any;

// ──────────────────────────────────────────────
// Hierarchical model (parsed from flat list)
// ──────────────────────────────────────────────

export interface ChainModel {
  chain: NftChain;
  rules: NftRule[];
}

export interface TableModel {
  table: NftTable;
  chains: ChainModel[];
  sets: NftSet[];
  maps: NftMap[];
  flowtables: NftFlowtable[];
  counters: NftCounter[];
  quotas: unknown[];
  limits: unknown[];
  ctHelpers: unknown[];
}

export interface RulesetModel {
  tables: TableModel[];
}

// ──────────────────────────────────────────────
// API types
// ──────────────────────────────────────────────

export interface RulesetResponse {
  model: RulesetModel;
  raw: { nftables: unknown[] };
}

export interface RulesetTextResponse {
  text: string;
}

export interface ParseResponse {
  valid: boolean;
  model?: RulesetModel;
  errors: string[];
}

export interface ValidateResponse {
  valid: boolean;
  errors: string[];
}

export interface ApplyResponse {
  apply_id: string;
  expires_at: number;
}

export interface ApplyStatus {
  state: "idle" | "pending_confirmation" | "reverting";
  apply_id: string | null;
  expires_at: number | null;
}
