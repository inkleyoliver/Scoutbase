import type { SupabaseClient } from "@supabase/supabase-js";
import { rankTodayActions } from "@/lib/ranking";
import { daysSince, todayISO } from "@/lib/date";
import { WAITING_CHASE_DAYS } from "@/lib/constants";
import { isStale } from "@/lib/staleness";
import type { Action } from "@/lib/types";

export interface DigestData {
  topFive: Action[];
  waitingChases: Action[];
  staleCount: number;
  skewMessage: string | null;
  inboxPendingCount: number;
}

/**
 * §8.1 — same ranking as the Today view, plus waiting-on chases >= 7 days,
 * stale count, a balance skew line if skewed, and inbox pending count.
 * Returns null if there is literally nothing to say (§8.1: "silence is a
 * feature" — skip the send rather than mail an empty digest).
 */
export async function buildDigest(supabase: SupabaseClient, ownerId: string): Promise<DigestData | null> {
  const today = todayISO();
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [{ data: openActions }, { data: recentlyDone }, { count: inboxPendingCountRaw }] = await Promise.all([
    supabase.from("actions").select("*").eq("owner_id", ownerId).in("status", ["open", "waiting"]),
    supabase
      .from("actions")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("status", "done")
      .gte("completed_at", fourteenDaysAgo.toISOString()),
    supabase.from("inbox_items").select("id", { count: "exact", head: true }).eq("owner_id", ownerId).eq("status", "pending"),
  ]);

  const actions = (openActions ?? []) as Action[];
  const { top } = rankTodayActions(actions, today);

  const waitingChases = actions.filter(
    (a) => a.status === "waiting" && a.waiting_since && (daysSince(a.waiting_since) ?? 0) >= WAITING_CHASE_DAYS
  );

  const staleCount = actions.filter((a) => isStale(a, today)).length;

  const skewMessage = buildSkewMessage(actions, (recentlyDone ?? []) as Action[]);

  const inboxPendingCount = inboxPendingCountRaw ?? 0;

  const nothingToSay =
    top.length === 0 &&
    waitingChases.length === 0 &&
    staleCount === 0 &&
    !skewMessage &&
    inboxPendingCount === 0;

  if (nothingToSay) return null;

  return { topFive: top, waitingChases, staleCount, skewMessage, inboxPendingCount };
}

function buildSkewMessage(open: Action[], done: Action[]): string | null {
  const latest = (role: "gsl" | "explorers") => {
    const dates = [...open, ...done]
      .filter((a) => a.role_key === role)
      .map((a) => a.updated_at)
      .sort()
      .reverse();
    return dates[0] ? daysSince(dates[0].slice(0, 10)) : null;
  };

  const gslDays = latest("gsl");
  const explorersDays = latest("explorers");
  const THRESHOLD = 5;

  if (gslDays !== null && (explorersDays === null || gslDays - (explorersDays ?? 0) > THRESHOLD) && gslDays >= THRESHOLD) {
    return `GSL has had no attention for ${gslDays} day${gslDays === 1 ? "" : "s"}.`;
  }
  if (explorersDays !== null && (gslDays === null || explorersDays - (gslDays ?? 0) > THRESHOLD) && explorersDays >= THRESHOLD) {
    return `Explorers has had no attention for ${explorersDays} day${explorersDays === 1 ? "" : "s"}.`;
  }
  return null;
}
