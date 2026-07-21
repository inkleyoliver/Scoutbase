import { ROLE_META } from "@/lib/constants";
import { daysSince } from "@/lib/date";
import type { Action } from "@/lib/types";

// §7.1 Balance indicator — informational, never shaming. A simple
// two-segment bar of currently-open workload across GSL vs Explorers (so it
// visibly moves the moment something is done or deleted), with a gentle line
// if one role has gone quiet — that "no attention for N days" read still
// factors in recent completions, since finishing something is attention.
export default function BalanceIndicator({
  openActions,
  recentlyDone,
}: {
  openActions: Action[];
  recentlyDone: Action[];
}) {
  const gslCount = openActions.filter((a) => a.role_key === "gsl").length;
  const explorersCount = openActions.filter((a) => a.role_key === "explorers").length;
  const total = gslCount + explorersCount;

  const gslPct = total === 0 ? 50 : Math.round((gslCount / total) * 100);
  const explorersPct = 100 - gslPct;

  const lastGslActivity = latestActivity(openActions, recentlyDone, "gsl");
  const lastExplorersActivity = latestActivity(openActions, recentlyDone, "explorers");

  const skewMessage = buildSkewMessage(lastGslActivity, lastExplorersActivity);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
        {total > 0 && (
          <>
            <div style={{ width: `${gslPct}%`, backgroundColor: ROLE_META.gsl.color }} />
            <div style={{ width: `${explorersPct}%`, backgroundColor: ROLE_META.explorers.color }} />
          </>
        )}
      </div>
      <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
        <span>{ROLE_META.gsl.label} {gslCount}</span>
        <span>{ROLE_META.explorers.label} {explorersCount}</span>
      </div>
      {skewMessage && <p className="text-xs text-[var(--foreground-muted)]">{skewMessage}</p>}
    </div>
  );
}

function latestActivity(open: Action[], done: Action[], role: "gsl" | "explorers"): string | null {
  const dates = [...open, ...done]
    .filter((a) => a.role_key === role)
    .map((a) => a.updated_at)
    .sort()
    .reverse();
  return dates[0] ?? null;
}

function buildSkewMessage(gslLast: string | null, explorersLast: string | null): string | null {
  const gslDays = gslLast ? daysSince(gslLast.slice(0, 10)) : null;
  const explorersDays = explorersLast ? daysSince(explorersLast.slice(0, 10)) : null;

  const THRESHOLD = 5;
  if (gslDays !== null && (explorersDays === null || gslDays - (explorersDays ?? 0) > THRESHOLD) && gslDays >= THRESHOLD) {
    return `GSL has had no attention for ${gslDays} day${gslDays === 1 ? "" : "s"}.`;
  }
  if (explorersDays !== null && (gslDays === null || explorersDays - (gslDays ?? 0) > THRESHOLD) && explorersDays >= THRESHOLD) {
    return `Explorers has had no attention for ${explorersDays} day${explorersDays === 1 ? "" : "s"}.`;
  }
  return null;
}
