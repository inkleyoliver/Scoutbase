"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RoleChip from "@/components/RoleChip";
import { CATEGORY_LABELS, EFFORT_LABELS } from "@/lib/constants";
import { createRecurrence, deleteRecurrence, setRecurrenceActive } from "@/lib/server/recurrenceMutations";
import type { ActionCategory, ActionEffort, Recurrence, RecurrenceRule, RoleKey } from "@/lib/types";

const RULE_LABEL: Record<RecurrenceRule, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  termly: "Termly",
  yearly: "Yearly",
};

export default function RecurringManager({ recurrences }: { recurrences: Recurrence[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Recurring tasks</h2>
        <button onClick={() => setShowForm((v) => !v)} className="text-sm text-[#4C1D95] dark:text-violet-300 font-medium">
          {showForm ? "Cancel" : "+ New"}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {recurrences.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)]">No recurring tasks set up yet.</p>
        ) : (
          recurrences.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <RoleChip roleKey={r.role_key} />
                  <span className="text-xs text-[var(--foreground-muted)]">{RULE_LABEL[r.rule]}</span>
                  <span className="text-xs text-[var(--foreground-muted)]">Next: {r.next_due}</span>
                  {!r.active && <span className="text-xs text-[var(--foreground-muted)]">(paused)</span>}
                </div>
                <span className={"font-medium text-sm " + (!r.active ? "opacity-60" : "")}>{r.title}</span>
              </div>
              <button
                onClick={() =>
                  setRecurrenceActive(r.id, !r.active).then(() => router.refresh())
                }
                className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
              >
                {r.active ? "Pause" : "Resume"}
              </button>
              <button
                onClick={() =>
                  confirm(`Delete "${r.title}"?`) && deleteRecurrence(r.id).then(() => router.refresh())
                }
                className="text-xs text-[var(--foreground-muted)] hover:text-[var(--overdue)]"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {showForm && <NewRecurrenceForm onDone={() => setShowForm(false)} />}
    </div>
  );
}

function NewRecurrenceForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>("both");
  const [category, setCategory] = useState<ActionCategory>("other");
  const [effort, setEffort] = useState<ActionEffort>("medium");
  const [rule, setRule] = useState<RecurrenceRule>("weekly");
  const [nextDue, setNextDue] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim() || !nextDue) {
      setError("Give it a title and a next-due date.");
      return;
    }
    setPending(true);
    const result = await createRecurrence({ title, role_key: roleKey, category, effort, rule, next_due: nextDue });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Trustee/exec update note"
        className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
      />
      <div className="grid grid-cols-2 gap-3">
        <select value={roleKey} onChange={(e) => setRoleKey(e.target.value as RoleKey)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
          <option value="gsl">GSL</option>
          <option value="explorers">Explorers</option>
          <option value="both">Personal</option>
        </select>
        <select value={rule} onChange={(e) => setRule(e.target.value as RecurrenceRule)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
          {Object.entries(RULE_LABEL).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <select value={category} onChange={(e) => setCategory(e.target.value as ActionCategory)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <select value={effort} onChange={(e) => setEffort(e.target.value as ActionEffort)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
          {Object.entries(EFFORT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Next due</label>
        <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm w-fit" />
      </div>
      {error && <p className="text-sm text-[var(--overdue)]">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onDone} className="h-10 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]">Cancel</button>
        <button type="button" onClick={submit} disabled={pending} className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50">
          {pending ? "Saving…" : "Add recurring task"}
        </button>
      </div>
    </div>
  );
}
