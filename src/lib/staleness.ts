import { daysSince, todayISO } from "@/lib/date";
import { STALE_DAYS } from "@/lib/constants";
import type { Action } from "@/lib/types";

/**
 * §7.3 — any OPEN action untouched (no status/notes/subtask change) for
 * 21+ days gets a quiet amber "Still real?" badge. Only status = 'open'
 * counts (waiting items have their own waiting-on nudge; done/archived
 * are irrelevant here).
 */
export function isStale(action: Pick<Action, "status" | "last_activity_at">, referenceISO: string = todayISO()): boolean {
  if (action.status !== "open") return false;
  const days = daysSince(action.last_activity_at.slice(0, 10), referenceISO);
  return days !== null && days >= STALE_DAYS;
}
