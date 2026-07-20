"use client";

import { useMemo, useState } from "react";
import ActionCard from "@/components/ActionCard";
import Modal from "@/components/Modal";
import ActionForm from "@/components/ActionForm";
import { useFocusMode } from "@/components/FocusModeContext";
import { FOCUS_MODE_TO_ROLE_KEY, CATEGORY_LABELS, EFFORT_LABELS } from "@/lib/constants";
import type { ActionCategory, ActionEffort, ActionWithSubtasks, Milestone } from "@/lib/types";

type StatusFilter = "open_waiting" | "done" | "archived" | "all";

export default function ActionsView({
  actions,
  milestones,
}: {
  actions: ActionWithSubtasks[];
  milestones: Milestone[];
}) {
  const { focusMode } = useFocusMode();
  const roleFilter = FOCUS_MODE_TO_ROLE_KEY[focusMode];

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open_waiting");
  const [category, setCategory] = useState<ActionCategory | "">("");
  const [effort, setEffort] = useState<ActionEffort | "">("");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [showNewModal, setShowNewModal] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return actions.filter((a) => {
      if (roleFilter && a.role_key !== roleFilter) return false;
      if (statusFilter === "open_waiting" && !["open", "waiting"].includes(a.status)) return false;
      if (statusFilter === "done" && a.status !== "done") return false;
      if (statusFilter === "archived" && a.status !== "archived") return false;
      if (category && a.category !== category) return false;
      if (effort && a.effort !== effort) return false;
      if (milestoneId && a.milestone_id !== milestoneId) return false;
      if (q) {
        const haystack = `${a.title} ${a.notes ?? ""} ${a.waiting_on ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [actions, roleFilter, statusFilter, category, effort, milestoneId, search]);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "open_waiting", label: "Open + Waiting" },
    { value: "done", label: "Done" },
    { value: "archived", label: "Archived" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Actions</h1>
        <button
          onClick={() => setShowNewModal(true)}
          className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium"
        >
          + New action
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search actions…"
        className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none focus:ring-2 focus:ring-[#4C1D95]"
      />

      <div className="flex flex-wrap gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ActionCategory | "")}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
        >
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={effort}
          onChange={(e) => setEffort(e.target.value as ActionEffort | "")}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
        >
          <option value="">All effort</option>
          {Object.entries(EFFORT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={milestoneId}
          onChange={(e) => setMilestoneId(e.target.value)}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
        >
          <option value="">All milestones</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)] py-8 text-center">
            Nothing matches these filters.
          </p>
        ) : (
          filtered.map((a) => <ActionCard key={a.id} action={a} />)
        )}
      </div>

      {showNewModal && (
        <Modal title="New action" onClose={() => setShowNewModal(false)}>
          <ActionForm
            milestones={milestones}
            defaultRole={roleFilter ?? undefined}
            onSaved={() => setShowNewModal(false)}
            onCancel={() => setShowNewModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
