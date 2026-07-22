"use client";

import { useMemo } from "react";
import Link from "next/link";
import RoleChip from "@/components/RoleChip";
import { StatusPill } from "@/components/StatusPill";
import { useFocusMode } from "@/components/FocusModeContext";
import { FOCUS_MODE_TO_ROLE_KEY } from "@/lib/constants";
import { formatRelativeDue, formatShortDate } from "@/lib/date";
import type { Action } from "@/lib/types";

// §10 home-page ask: a calendar/agenda view of everything with a due date,
// grouped by date so "what's coming" is a glance, not a search. Relative
// time stays the prominent label (§7.1's time-blindness rule applies here
// too), calendar date is secondary.
export default function CalendarView({ actions }: { actions: Action[] }) {
  const { focusMode } = useFocusMode();
  const roleFilter = FOCUS_MODE_TO_ROLE_KEY[focusMode];

  const scoped = useMemo(
    () => (roleFilter ? actions.filter((a) => a.role_key === roleFilter) : actions),
    [actions, roleFilter]
  );

  const groups = useMemo(() => {
    const byDate = new Map<string, Action[]>();
    for (const a of scoped) {
      if (!a.due_date) continue;
      const list = byDate.get(a.due_date) ?? [];
      list.push(a);
      byDate.set(a.due_date, list);
    }
    return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [scoped]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 max-w-2xl">
      <h1 className="text-xl font-semibold">Calendar</h1>

      {groups.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)] py-10 text-center">
          Nothing with a due date right now.
        </p>
      ) : (
        groups.map(([date, items]) => (
          <section key={date} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-[var(--foreground-muted)]">
              {formatRelativeDue(date)} <span className="font-normal">· {formatShortDate(date)}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {items.map((a) => (
                <Link
                  key={a.id}
                  href={`/actions/${a.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 min-h-[56px]"
                >
                  <span className="font-medium leading-snug">{a.title}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusPill status={a.status} />
                    <RoleChip roleKey={a.role_key} />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
