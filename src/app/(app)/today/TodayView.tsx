"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useFocusMode } from "@/components/FocusModeContext";
import { FOCUS_MODE_TO_ROLE_KEY } from "@/lib/constants";
import { rankTodayActions } from "@/lib/ranking";
import TodayCard from "@/components/TodayCard";
import BalanceIndicator from "@/components/BalanceIndicator";
import WaitingOnStrip from "@/components/WaitingOnStrip";
import RoleChip from "@/components/RoleChip";
import { formatRelativeDue, formatShortDate } from "@/lib/date";
import type { Action } from "@/lib/types";

export default function TodayView({
  openActions,
  recentlyDone,
}: {
  openActions: Action[];
  recentlyDone: Action[];
}) {
  const { focusMode } = useFocusMode();
  const roleFilter = FOCUS_MODE_TO_ROLE_KEY[focusMode];

  const scopedOpen = useMemo(
    () => (roleFilter ? openActions.filter((a) => a.role_key === roleFilter) : openActions),
    [openActions, roleFilter]
  );

  const { top, remaining } = useMemo(() => rankTodayActions(scopedOpen), [scopedOpen]);

  // "Coming up" — a quick look further out than Today's top 5, without
  // having to leave the home page. Same items may still appear in `top`;
  // excluded here so nothing is listed twice on the same screen.
  const topIds = useMemo(() => new Set(top.map((a) => a.id)), [top]);
  const comingUp = useMemo(
    () =>
      scopedOpen
        .filter((a) => a.due_date && !topIds.has(a.id))
        .sort((a, b) => a.due_date!.localeCompare(b.due_date!))
        .slice(0, 5),
    [scopedOpen, topIds]
  );

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Today</h1>

      {focusMode === "All" && (
        <BalanceIndicator openActions={openActions} recentlyDone={recentlyDone} />
      )}

      <WaitingOnStrip actions={scopedOpen} />

      <div className="flex flex-col gap-3">
        {top.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)] py-8 text-center">
            Nothing urgent right now. Nice.
          </p>
        ) : (
          top.map((a) => <TodayCard key={a.id} action={a} />)
        )}
      </div>

      {remaining.length > 0 && (
        <Link href="/actions" className="text-sm text-[var(--foreground-muted)] hover:underline">
          + {remaining.length} more when you&apos;re ready
        </Link>
      )}

      {comingUp.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
              Coming up
            </h2>
            <Link href="/more/calendar" className="text-xs text-[var(--foreground-muted)] hover:underline">
              Full calendar
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {comingUp.map((a) => (
              <Link
                key={a.id}
                href={`/actions/${a.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <span className="text-sm font-medium leading-snug">{a.title}</span>
                <div className="flex items-center gap-2 shrink-0 text-xs text-[var(--foreground-muted)]">
                  <span>{formatRelativeDue(a.due_date)}</span>
                  <span className="opacity-70">({formatShortDate(a.due_date)})</span>
                  <RoleChip roleKey={a.role_key} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
