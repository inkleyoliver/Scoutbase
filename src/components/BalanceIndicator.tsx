import { ROLE_META } from "@/lib/constants";
import { daysSince } from "@/lib/date";
import type { Action, RoleKey } from "@/lib/types";

const BAR_ROLES: RoleKey[] = ["gsl", "explorers", "both"];

// §7.1 Balance indicator — informational, never shaming. A simple
// multi-segment bar of currently-open workload across GSL / Explorers /
// Personal (so it visibly moves the moment something is done or deleted),
// with a gentle line if one has gone quiet — that "no attention for N days"
// read still factors in recent completions, since finishing something is
// attention.
export default function BalanceIndicator({
  openActions,
  recentlyDone,
}: {
  openActions: Action[];
  recentlyDone: Action[];
}) {
  const counts = BAR_ROLES.map((role) => ({
    role,
    count: openActions.filter((a) => a.role_key === role).length,
  }));
  const total = counts.reduce((sum, c) => sum + c.count, 0);

  const lastActivity = BAR_ROLES.map((role) => ({
    role,
    last: latestActivity(openActions, recentlyDone, role),
  }));

  const skewMessage = buildSkewMessage(lastActivity);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
        {total > 0 &&
          counts.map(({ role, count }) => (
            <div
              key={role}
              style={{ width: `${Math.round((count / total) * 100)}%`, backgroundColor: ROLE_META[role].color }}
            />
          ))}
      </div>
      <div className="flex justify-between text-xs text-[var(--foreground-muted)]">
        {counts.map(({ role, count }) => (
          <span key={role}>
            {ROLE_META[role].label} {count}
          </span>
        ))}
      </div>
      {skewMessage && <p className="text-xs text-[var(--foreground-muted)]">{skewMessage}</p>}
    </div>
  );
}

function latestActivity(open: Action[], done: Action[], role: RoleKey): string | null {
  const dates = [...open, ...done]
    .filter((a) => a.role_key === role)
    .map((a) => a.updated_at)
    .sort()
    .reverse();
  return dates[0] ?? null;
}

function buildSkewMessage(lastActivity: { role: RoleKey; last: string | null }[]): string | null {
  const THRESHOLD = 5;
  const days = lastActivity.map(({ role, last }) => ({
    role,
    days: last ? daysSince(last.slice(0, 10)) : null,
  }));

  const knownDays = days.filter((d): d is { role: RoleKey; days: number } => d.days !== null);

  for (const { role, days: roleDays } of days) {
    if (roleDays === null) continue;
    const others = knownDays.filter((d) => d.role !== role);
    const bestOther = others.length > 0 ? Math.min(...others.map((d) => d.days)) : null;
    if (roleDays >= THRESHOLD && (bestOther === null || roleDays - bestOther > THRESHOLD)) {
      return `${ROLE_META[role].label} has had no attention for ${roleDays} day${roleDays === 1 ? "" : "s"}.`;
    }
  }
  return null;
}
