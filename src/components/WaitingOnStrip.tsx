import Link from "next/link";
import { daysSince } from "@/lib/date";
import { ROLE_META } from "@/lib/constants";
import type { Action } from "@/lib/types";

// §7.1 Waiting-on strip — horizontal scroll of chase chips, e.g. "Dave — 9
// days". Items enter here when status = waiting.
export default function WaitingOnStrip({ actions }: { actions: Action[] }) {
  const waiting = actions
    .filter((a) => a.status === "waiting" && a.waiting_on)
    .map((a) => ({ action: a, days: a.waiting_since ? daysSince(a.waiting_since) ?? 0 : 0 }))
    .sort((a, b) => b.days - a.days);

  if (waiting.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-[var(--foreground-muted)]">Waiting on</h2>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {waiting.map(({ action, days }) => (
          <Link
            key={action.id}
            href={`/actions/${action.id}`}
            className="shrink-0 flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm"
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ backgroundColor: ROLE_META[action.role_key].color }}
            />
            <span className="font-medium">{action.waiting_on}</span>
            <span className="text-[var(--foreground-muted)]">
              — {days} day{days === 1 ? "" : "s"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
