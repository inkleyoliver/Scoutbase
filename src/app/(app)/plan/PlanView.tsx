"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Modal from "@/components/Modal";
import RoleChip from "@/components/RoleChip";
import { useFocusMode } from "@/components/FocusModeContext";
import { FOCUS_MODE_TO_ROLE_KEY } from "@/lib/constants";
import { createMilestone } from "@/lib/server/milestoneMutations";
import { useRouter } from "next/navigation";
import type { Milestone, MilestoneStatus, RoleKey } from "@/lib/types";

const STATUS_LABEL: Record<MilestoneStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
  parked: "Parked",
};

const THEME_LABEL: Record<string, string> = {
  recruitment: "Recruitment",
  governance: "Governance",
  "section-growth": "Section growth",
  programme: "Programme",
  vision: "10-year vision",
};

export default function PlanView({
  milestones,
  progress,
}: {
  milestones: Milestone[];
  progress: Record<string, { done: number; total: number }>;
}) {
  const { focusMode } = useFocusMode();
  const roleFilter = FOCUS_MODE_TO_ROLE_KEY[focusMode];
  const [showNew, setShowNew] = useState(false);

  const filtered = roleFilter ? milestones.filter((m) => m.role_key === roleFilter) : milestones;

  const grouped = useMemo(() => {
    const byTheme = new Map<string, Milestone[]>();
    for (const m of filtered) {
      const key = m.theme ?? "other";
      const list = byTheme.get(key) ?? [];
      list.push(m);
      byTheme.set(key, list);
    }
    return Array.from(byTheme.entries());
  }, [filtered]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Plan</h1>
        <button
          onClick={() => setShowNew(true)}
          className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium"
        >
          + New milestone
        </button>
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-[var(--foreground-muted)] py-8 text-center">
          No milestones yet for this view.
        </p>
      )}

      {grouped.map(([theme, items]) => (
        <section key={theme} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
            {THEME_LABEL[theme] ?? theme}
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((m) => {
              const p = progress[m.id] ?? { done: 0, total: 0 };
              return (
                <Link
                  key={m.id}
                  href={`/plan/${m.id}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[64px]"
                >
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <span className="font-medium leading-snug">{m.title}</span>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <RoleChip roleKey={m.role_key} />
                      <span className="text-[var(--foreground-muted)]">{STATUS_LABEL[m.status]}</span>
                      {m.target_date && (
                        <span className="text-[var(--foreground-muted)]">Target: {m.target_date}</span>
                      )}
                      <span className="text-[var(--foreground-muted)]">
                        {p.done}/{p.total} actions done
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {showNew && (
        <Modal title="New milestone" onClose={() => setShowNew(false)}>
          <NewMilestoneForm defaultRole={roleFilter ?? undefined} onDone={() => setShowNew(false)} />
        </Modal>
      )}
    </div>
  );
}

function NewMilestoneForm({ defaultRole, onDone }: { defaultRole?: RoleKey; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>(defaultRole ?? "gsl");
  const [theme, setTheme] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    if (!title.trim()) {
      setError("Give it a title.");
      return;
    }
    setPending(true);
    const result = await createMilestone({
      title,
      role_key: roleKey,
      theme: theme || null,
      target_date: targetDate || null,
      description: description || null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Title</label>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-base outline-none focus:ring-2 focus:ring-[#4C1D95]"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Role</label>
          <select
            value={roleKey}
            onChange={(e) => setRoleKey(e.target.value as RoleKey)}
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          >
            <option value="gsl">GSL</option>
            <option value="explorers">Explorers</option>
            <option value="both">Personal</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Theme</label>
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g. governance"
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Target date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm resize-none"
        />
      </div>
      {error && <p className="text-sm text-[var(--overdue)]">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="h-11 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]">
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="h-11 px-5 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Saving…" : "Add milestone"}
        </button>
      </div>
    </div>
  );
}
