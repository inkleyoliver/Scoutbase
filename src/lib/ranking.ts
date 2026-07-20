import { daysDiff, todayISO } from "./date";
import type { Action } from "./types";

// §7.1 Today ranking:
// overdue -> due today -> due in <=2 days -> urgent priority -> oldest high-priority.
// Max 5 shown; everything else sits behind "+ N more".

function isVisible(a: Action, today: string): boolean {
  if (a.status !== "open" && a.status !== "waiting") return false;
  if (a.snoozed_until && a.snoozed_until > today) return false;
  return true;
}

function bucketOf(a: Action, today: string): number {
  if (a.due_date) {
    const diff = daysDiff(a.due_date, today);
    if (diff < 0) return 0; // overdue
    if (diff === 0) return 1; // due today
    if (diff <= 2) return 2; // due in <=2 days
  }
  if (a.priority === "urgent") return 3;
  if (a.priority === "high") return 4; // oldest high-priority
  return 5; // not eligible for Today, only via "+N more"
}

export interface RankedToday {
  top: Action[];
  remaining: Action[];
}

export function rankTodayActions(actions: Action[], today: string = todayISO()): RankedToday {
  const eligible = actions.filter((a) => isVisible(a, today));

  const withBucket = eligible.map((a) => ({ a, bucket: bucketOf(a, today) }));

  withBucket.sort((x, y) => {
    if (x.bucket !== y.bucket) return x.bucket - y.bucket;
    // Within a bucket: earliest due date first, else oldest created first.
    if (x.a.due_date && y.a.due_date && x.a.due_date !== y.a.due_date) {
      return x.a.due_date < y.a.due_date ? -1 : 1;
    }
    return x.a.created_at < y.a.created_at ? -1 : 1;
  });

  const ranked = withBucket.filter((x) => x.bucket <= 4).map((x) => x.a);
  const rest = eligible.filter((a) => !ranked.includes(a));

  const top = ranked.slice(0, 5);
  const remaining = [...ranked.slice(5), ...rest];

  return { top, remaining };
}
