"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ActionCard from "@/components/ActionCard";
import RoleChip from "@/components/RoleChip";
import { createAction } from "@/lib/server/actionMutations";
import { deleteMilestone, setMilestoneStatus, updateMilestone } from "@/lib/server/milestoneMutations";
import type { Action, Milestone, MilestoneStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: "not_started", label: "Not started" },
  { value: "in_progress", label: "In progress" },
  { value: "complete", label: "Complete" },
  { value: "parked", label: "Parked" },
];

export default function MilestoneDetailView({
  milestone,
  actions,
}: {
  milestone: Milestone;
  actions: Action[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState(milestone.description ?? "");
  const [savingDescription, setSavingDescription] = useState(false);

  const doneCount = actions.filter((a) => a.status === "done").length;

  function addAction() {
    if (!newTitle.trim()) return;
    startTransition(async () => {
      await createAction({ title: newTitle, role_key: milestone.role_key, milestone_id: milestone.id });
      setNewTitle("");
      router.refresh();
    });
  }

  function changeStatus(status: MilestoneStatus) {
    startTransition(async () => {
      await setMilestoneStatus(milestone.id, status);
      router.refresh();
    });
  }

  async function saveDescription() {
    setSavingDescription(true);
    await updateMilestone({ id: milestone.id, description: editingDescription || null });
    setSavingDescription(false);
    router.refresh();
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl flex flex-col gap-6">
      <Link href="/plan" className="text-sm text-[var(--foreground-muted)] hover:underline">
        ← Plan
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <RoleChip roleKey={milestone.role_key} />
          {milestone.theme && (
            <span className="text-xs text-[var(--foreground-muted)]">{milestone.theme}</span>
          )}
        </div>
        <h1 className="text-xl font-semibold">{milestone.title}</h1>
        <p className="text-sm text-[var(--foreground-muted)]">
          {doneCount}/{actions.length} actions done
          {milestone.target_date && ` · Target: ${milestone.target_date}`}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium">Status</label>
        <select
          value={milestone.status}
          disabled={pending}
          onChange={(e) => changeStatus(e.target.value as MilestoneStatus)}
          className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm w-fit"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </section>

      <section className="flex flex-col gap-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={editingDescription}
          onChange={(e) => setEditingDescription(e.target.value)}
          onBlur={saveDescription}
          rows={4}
          placeholder="What does success look like?"
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm resize-none"
        />
        {savingDescription && <span className="text-xs text-[var(--foreground-muted)]">Saving…</span>}
      </section>

      <section className="flex flex-col gap-3 border-t border-[var(--border)] pt-5">
        <h2 className="text-sm font-semibold">Attached actions</h2>
        <div className="flex gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add an action for this milestone…"
            onKeyDown={(e) => e.key === "Enter" && addAction()}
            className="h-11 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          />
          <button
            onClick={addAction}
            disabled={pending}
            className="h-11 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium"
          >
            Add
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {actions.length === 0 ? (
            <p className="text-sm text-[var(--foreground-muted)]">No actions attached yet.</p>
          ) : (
            actions.map((a) => <ActionCard key={a.id} action={a} />)
          )}
        </div>
      </section>

      <section className="flex justify-end border-t border-[var(--border)] pt-5">
        <button
          disabled={pending}
          onClick={() => {
            const warning =
              actions.length > 0
                ? `Delete "${milestone.title}"? This can't be undone. Its ${actions.length} attached action${actions.length === 1 ? "" : "s"} will stay, just unlinked from this milestone.`
                : `Delete "${milestone.title}"? This can't be undone.`;
            if (confirm(warning)) {
              startTransition(async () => {
                await deleteMilestone(milestone.id);
                router.push("/plan");
              });
            }
          }}
          className="h-10 px-4 rounded-lg border border-[var(--overdue)] text-sm text-[var(--overdue)]"
        >
          Delete permanently
        </button>
      </section>
    </div>
  );
}
