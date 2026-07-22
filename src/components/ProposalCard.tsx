"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_LABELS, EFFORT_LABELS, PRIORITY_LABELS, ROLE_META } from "@/lib/constants";
import { acceptProposalItem, discardProposalItem } from "@/lib/server/inboxMutations";
import type { ActionCategory, ActionEffort, ActionPriority, AiProposalItem, Milestone, RoleKey } from "@/lib/types";

const ROLE_KEYS: RoleKey[] = ["gsl", "explorers", "both"];

// §5.1 step 5 — proposal cards with the parsed fields pre-filled, shown as
// an editable form up front so every field can be adjusted before anything
// is saved. Nothing is silently filed.
export default function ProposalCard({
  inboxItemId,
  item,
  index,
  milestones,
}: {
  inboxItemId: string;
  item: AiProposalItem;
  index: number;
  milestones: Milestone[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(item.title);
  const [roleKey, setRoleKey] = useState<RoleKey>(item.role_key);
  const [category, setCategory] = useState<ActionCategory>(item.category);
  const [priority, setPriority] = useState<ActionPriority>(item.priority);
  const [effort, setEffort] = useState<ActionEffort>(item.effort);
  const [dueDate, setDueDate] = useState(item.due_date ?? "");
  const [waitingOn, setWaitingOn] = useState(item.waiting_on ?? "");

  const relevantMilestones = useMemo(() => milestones.filter((m) => m.role_key === roleKey), [milestones, roleKey]);

  const [milestoneId, setMilestoneId] = useState(() => {
    if (!item.milestone_title_match) return "";
    const match = milestones.find(
      (m) => m.role_key === item.role_key && m.title.toLowerCase() === item.milestone_title_match!.toLowerCase()
    );
    return match?.id ?? "";
  });

  function add() {
    startTransition(async () => {
      await acceptProposalItem(inboxItemId, index, {
        title,
        role_key: roleKey,
        category,
        priority,
        effort,
        due_date: dueDate || null,
        waiting_on: waitingOn || null,
        milestone_id: milestoneId || null,
      });
      router.refresh();
    });
  }

  function discard() {
    startTransition(async () => {
      await discardProposalItem(inboxItemId, index);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={roleKey}
          onChange={(e) => {
            const next = e.target.value as RoleKey;
            setRoleKey(next);
            if (!relevantMilestones.some((m) => m.id === milestoneId)) setMilestoneId("");
          }}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
        >
          {ROLE_KEYS.map((k) => (
            <option key={k} value={k}>
              {ROLE_META[k].label}
            </option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as ActionCategory)}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
        >
          {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as ActionPriority)}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
        >
          {Object.entries(PRIORITY_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={effort}
          onChange={(e) => setEffort(e.target.value as ActionEffort)}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
        >
          {Object.entries(EFFORT_LABELS).map(([k, l]) => (
            <option key={k} value={k}>
              {l}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
        />
        <select
          value={milestoneId}
          onChange={(e) => setMilestoneId(e.target.value)}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
        >
          <option value="">No milestone</option>
          {relevantMilestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <input
          value={waitingOn}
          onChange={(e) => setWaitingOn(e.target.value)}
          placeholder="Waiting on…"
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm col-span-2"
        />
      </div>

      {item.subtasks.length > 0 && (
        <ul className="text-xs text-[var(--foreground-muted)] list-disc list-inside">
          {item.subtasks.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 pt-1">
        <button
          disabled={pending || !title.trim()}
          onClick={add}
          className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
        <button
          disabled={pending}
          onClick={discard}
          className="h-10 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
