"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAction, updateAction } from "@/lib/server/actionMutations";
import { CATEGORY_LABELS, EFFORT_LABELS, PRIORITY_LABELS, ROLE_META } from "@/lib/constants";
import type { Action, ActionCategory, ActionEffort, ActionPriority, Milestone, RoleKey } from "@/lib/types";

const ROLE_KEYS: RoleKey[] = ["gsl", "explorers", "both"];

interface Props {
  action?: Action;
  milestones: Milestone[];
  defaultRole?: RoleKey;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
}

// Every field except title is optional — capture-time friction must stay
// near zero (§1.1). Role defaults sensibly rather than being required.
export default function ActionForm({ action, milestones, defaultRole, onSaved, onCancel }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(action?.title ?? "");
  const [roleKey, setRoleKey] = useState<RoleKey>(action?.role_key ?? defaultRole ?? "both");
  const [category, setCategory] = useState<ActionCategory>(action?.category ?? "other");
  const [priority, setPriority] = useState<ActionPriority>(action?.priority ?? "normal");
  const [effort, setEffort] = useState<ActionEffort>(action?.effort ?? "medium");
  const [dueDate, setDueDate] = useState(action?.due_date ?? "");
  const [notes, setNotes] = useState(action?.notes ?? "");
  const [milestoneId, setMilestoneId] = useState(action?.milestone_id ?? "");
  const [waitingOn, setWaitingOn] = useState(action?.waiting_on ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const relevantMilestones = milestones.filter((m) => m.role_key === roleKey);

  function submit() {
    if (!title.trim()) {
      setError("Give it a title.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const common = {
        title,
        role_key: roleKey,
        category,
        priority,
        effort,
        due_date: dueDate || null,
        notes: notes || null,
        milestone_id: milestoneId || null,
        waiting_on: waitingOn || null,
      };

      const result = action
        ? await updateAction({ id: action.id, ...common })
        : await createAction(common);

      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }

      router.refresh();
      if (onSaved) {
        const createdId = "id" in result && typeof result.id === "string" ? result.id : "";
        onSaved(action ? action.id : createdId);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          className="h-12 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none focus:ring-2 focus:ring-[#4C1D95]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Role">
          <select
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value as RoleKey)}
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          >
            {ROLE_KEYS.map((k) => (
              <option key={k} value={k}>
                {ROLE_META[k].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Category">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as ActionCategory)}
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          >
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as ActionPriority)}
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          >
            {Object.entries(PRIORITY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Effort">
          <select
            value={effort}
            onChange={(e) => setEffort(e.target.value as ActionEffort)}
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          >
            {Object.entries(EFFORT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Due date">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          />
        </Field>
        <Field label="Milestone">
          <select
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          >
            <option value="">None</option>
            {relevantMilestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Waiting on (leave blank unless chasing someone)">
        <input
          value={waitingOn}
          onChange={(e) => setWaitingOn(e.target.value)}
          placeholder="e.g. Dave"
          className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm resize-none"
        />
      </Field>

      {error && <p className="text-sm text-[var(--overdue)]">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-11 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]">
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="h-11 px-5 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Saving…" : action ? "Save changes" : "Add action"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
