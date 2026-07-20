"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ActionForm from "@/components/ActionForm";
import RoleChip from "@/components/RoleChip";
import { StatusPill } from "@/components/StatusPill";
import {
  addSubtask,
  archiveAction,
  deleteSubtask,
  reopenAction,
  snoozeAction,
  toggleSubtask,
  type SnoozeOption,
} from "@/lib/server/actionMutations";
import type { Action, Milestone, Subtask } from "@/lib/types";

export default function ActionDetailView({
  action,
  subtasks,
  milestones,
}: {
  action: Action;
  subtasks: Subtask[];
  milestones: Milestone[];
}) {
  const router = useRouter();
  const [newSubtask, setNewSubtask] = useState("");
  const [pending, startTransition] = useTransition();

  function snooze(option: SnoozeOption) {
    startTransition(async () => {
      await snoozeAction(action.id, option);
      router.refresh();
    });
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/actions" className="text-[var(--foreground-muted)] hover:underline">
          ← Actions
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <RoleChip roleKey={action.role_key} />
        <StatusPill status={action.status} />
        {action.snoozed_until && (
          <span className="text-xs text-[var(--foreground-muted)]">Snoozed until {action.snoozed_until}</span>
        )}
      </div>

      <ActionForm action={action} milestones={milestones} />

      <section className="flex flex-col gap-3 border-t border-[var(--border)] pt-5">
        <h2 className="text-sm font-semibold">Subtasks</h2>
        <div className="flex flex-col gap-2">
          {subtasks.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={s.done}
                onChange={(e) =>
                  startTransition(async () => {
                    await toggleSubtask(s.id, e.target.checked);
                    router.refresh();
                  })
                }
                className="h-5 w-5"
              />
              <span className={"flex-1 text-sm " + (s.done ? "line-through opacity-60" : "")}>{s.title}</span>
              <button
                aria-label="Delete subtask"
                onClick={() =>
                  startTransition(async () => {
                    await deleteSubtask(s.id);
                    router.refresh();
                  })
                }
                className="text-xs text-[var(--foreground-muted)] hover:text-[var(--overdue)]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newSubtask}
            onChange={(e) => setNewSubtask(e.target.value)}
            placeholder="Add a subtask…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newSubtask.trim()) {
                startTransition(async () => {
                  await addSubtask(action.id, newSubtask, subtasks.length);
                  setNewSubtask("");
                  router.refresh();
                });
              }
            }}
            className="h-10 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-[var(--border)] pt-5">
        <h2 className="text-sm font-semibold">Snooze</h2>
        <div className="flex flex-wrap gap-2">
          <button disabled={pending} onClick={() => snooze("tomorrow")} className="h-10 px-3 rounded-lg border border-[var(--border)] text-sm">
            Tomorrow
          </button>
          <button disabled={pending} onClick={() => snooze("3days")} className="h-10 px-3 rounded-lg border border-[var(--border)] text-sm">
            3 days
          </button>
          <button disabled={pending} onClick={() => snooze("nextweek")} className="h-10 px-3 rounded-lg border border-[var(--border)] text-sm">
            Next week
          </button>
          <input
            type="date"
            disabled={pending}
            onChange={(e) => e.target.value && snooze({ date: e.target.value })}
            className="h-10 px-3 rounded-lg border border-[var(--border)] text-sm"
          />
        </div>
      </section>

      <section className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-5">
        {action.status !== "archived" ? (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await archiveAction(action.id);
                router.refresh();
              })
            }
            className="h-10 px-4 rounded-lg border border-[var(--border)] text-sm text-[var(--foreground-muted)]"
          >
            Archive
          </button>
        ) : (
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await reopenAction(action.id);
                router.refresh();
              })
            }
            className="h-10 px-4 rounded-lg border border-[var(--border)] text-sm"
          >
            Reopen
          </button>
        )}
      </section>
    </div>
  );
}
