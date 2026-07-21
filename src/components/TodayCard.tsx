"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import RoleChip from "./RoleChip";
import { formatRelativeDue, formatShortDate } from "@/lib/date";
import { deleteActionPermanently, markActionDone, snoozeAction, type SnoozeOption } from "@/lib/server/actionMutations";
import type { Action } from "@/lib/types";

// §7.1 / §10 — relative time is the largest text on the card after the
// title; calendar date is small/secondary. Min height ~72px, large touch
// targets for the quick actions.
export default function TodayCard({ action }: { action: Action }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  const relative = formatRelativeDue(action.due_date);
  const isOverdue = relative?.startsWith("Overdue");

  function snooze(option: SnoozeOption) {
    setSnoozeOpen(false);
    startTransition(async () => {
      await snoozeAction(action.id, option);
      router.refresh();
    });
  }

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border-l-4 bg-[var(--surface)] p-4 min-h-[72px]"
      style={{ borderLeftColor: isOverdue ? "var(--overdue)" : undefined }}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/actions/${action.id}`} className="font-medium leading-snug">
          {action.title}
        </Link>
        <RoleChip roleKey={action.role_key} className="shrink-0" />
      </div>

      {relative && (
        <div>
          <span className={"text-lg font-semibold " + (isOverdue ? "text-[var(--overdue)]" : "")}>{relative}</span>
          <span className="ml-2 text-xs text-[var(--foreground-muted)]">{formatShortDate(action.due_date)}</span>
        </div>
      )}
      {!relative && action.priority !== "normal" && (
        <span className="text-sm font-medium text-[var(--foreground-muted)] uppercase tracking-wide">
          {action.priority} priority
        </span>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await markActionDone(action.id);
              router.refresh();
            })
          }
          className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
        >
          Done ✓
        </button>

        <div className="relative">
          <button
            disabled={pending}
            onClick={() => setSnoozeOpen((v) => !v)}
            className="h-10 px-4 rounded-lg border border-[var(--border)] text-sm font-medium"
          >
            Snooze
          </button>
          {snoozeOpen && (
            <div className="absolute z-10 mt-1 flex flex-col gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg min-w-[10rem]">
              <button onClick={() => snooze("tomorrow")} className="text-left text-sm px-3 py-2 rounded hover:bg-[var(--surface-muted)]">
                Tomorrow
              </button>
              <button onClick={() => snooze("3days")} className="text-left text-sm px-3 py-2 rounded hover:bg-[var(--surface-muted)]">
                3 days
              </button>
              <button onClick={() => snooze("nextweek")} className="text-left text-sm px-3 py-2 rounded hover:bg-[var(--surface-muted)]">
                Next week
              </button>
              <label className="text-left text-sm px-3 py-2 rounded hover:bg-[var(--surface-muted)] cursor-pointer">
                Pick date…
                <input
                  type="date"
                  className="sr-only"
                  onChange={(e) => e.target.value && snooze({ date: e.target.value })}
                />
              </label>
            </div>
          )}
        </div>

        <Link href={`/actions/${action.id}`} className="h-10 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)] flex items-center">
          Open
        </Link>

        <button
          disabled={pending}
          onClick={() => {
            if (confirm(`Delete "${action.title}"? This can't be undone.`)) {
              startTransition(async () => {
                await deleteActionPermanently(action.id);
                router.refresh();
              });
            }
          }}
          className="h-10 px-3 rounded-lg text-sm font-medium text-[var(--foreground-muted)] hover:text-[var(--overdue)] ml-auto"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
