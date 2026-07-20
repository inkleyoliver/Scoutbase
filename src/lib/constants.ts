import type { ActionCategory, ActionEffort, ActionPriority, FocusMode, RoleKey } from "./types";

// §3 — role colours, used as accents only (chips, left borders).
export const ROLE_META: Record<RoleKey, { label: string; color: string; colorSoft: string }> = {
  gsl: { label: "GSL", color: "#4C1D95", colorSoft: "#EDE9FE" },
  explorers: { label: "Explorers", color: "#0F766E", colorSoft: "#CCFBF1" },
  both: { label: "Both / Personal", color: "#6B7280", colorSoft: "#F3F4F6" },
};

export const FOCUS_MODE_TO_ROLE_KEY: Record<FocusMode, RoleKey | null> = {
  All: null,
  GSL: "gsl",
  Explorers: "explorers",
};

export const FOCUS_MODE_STORAGE_KEY = "scoutbase:focus-mode";

export const CATEGORY_LABELS: Record<ActionCategory, string> = {
  governance: "Governance",
  people: "People",
  comms: "Comms",
  programme: "Programme",
  admin: "Admin",
  other: "Other",
};

export const PRIORITY_LABELS: Record<ActionPriority, string> = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

export const EFFORT_LABELS: Record<ActionEffort, string> = {
  quick: "Quick (≤15 min)",
  medium: "Medium",
  big: "Big",
};

export const STALE_DAYS = 21;
export const AUTO_ARCHIVE_DAYS = 14;
export const WAITING_CHASE_DAYS = 7;
