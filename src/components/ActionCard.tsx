"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import RoleChip from "./RoleChip";
import { StatusPill, PriorityLabel } from "./StatusPill";
import { CATEGORY_LABELS, EFFORT_LABELS } from "@/lib/constants";
import { formatShortDate, formatRelativeDue } from "@/lib/date";
import { markActionDone } from "@/lib/server/actionMutations";
import StaleBadge from "./StaleBadge";
import { isStale } from "@/lib/staleness";
import type { ActionWithSubtasks } from "@/lib/types";

export default function ActionCard({ action }: { action: ActionWithSubtasks }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const relative = formatRelativeDue(action.due_date);
  const isOverdue = relative?.startsWith("Overdue");
  const doneCount = action.subtasks?.filter((s) => s.done).length ?? 0;
  const totalCount = action.subtasks?.length ?? 0;
  const stale = isStale(action);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[72px]">
    <div className="flex items-start gap-3">
      <button
        aria-label="Mark done"
        disabled={pending || action.status === "done"}
        onClick={() =>
          startTransition(async () => {
            await markActionDone(action.id);
            router.refresh();
          })
        }
        className={
          "mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center text-xs " +
          (action.status === "done"
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "border-[var(--border)] text-transparent hover:border-emerald-500")
        }
      >
        ✓
      </button>

      <Link href={`/actions/${action.id}`} className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <span className={"font-medium leading-snug " + (action.status === "done" ? "line-through opacity-60" : "")}>
            {action.title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <RoleChip roleKey={action.role_key} />
          <StatusPill status={action.status} />
          <PriorityLabel priority={action.priority} />
          <span className="text-[var(--foreground-muted)]">{CATEGORY_LABELS[action.category]}</span>
          <span className="text-[var(--foreground-muted)]">{EFFORT_LABELS[action.effort]}</span>
          {totalCount > 0 && (
            <span className="text-[var(--foreground-muted)]">
              {doneCount}/{totalCount} subtasks
            </span>
          )}
        </div>

        {(relative || action.waiting_on) && (
          <div className="flex items-center gap-3 text-sm">
            {relative && (
              <span className={isOverdue ? "font-semibold text-[var(--overdue)]" : "text-[var(--foreground-muted)]"}>
                {relative}
                <span className="ml-1 font-normal opacity-70">({formatShortDate(action.due_date)})</span>
              </span>
            )}
            {action.waiting_on && (
              <span className="text-amber-700 dark:text-amber-400">Waiting: {action.waiting_on}</span>
            )}
          </div>
        )}
      </Link>
    </div>

      {stale && <StaleBadge actionId={action.id} />}
    </div>
  );
}
