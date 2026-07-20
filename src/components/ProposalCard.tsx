"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import RoleChip from "./RoleChip";
import { CATEGORY_LABELS, EFFORT_LABELS, PRIORITY_LABELS, ROLE_META } from "@/lib/constants";
import { formatShortDate } from "@/lib/date";
import { acceptProposalItem, discardProposalItem } from "@/lib/server/inboxMutations";
import type { ActionCategory, ActionEffort, ActionPriority, AiProposalItem, RoleKey } from "@/lib/types";

const ROLE_KEYS: RoleKey[] = ["gsl", "explorers", "both"];

// §5.1 step 5 — proposal cards with the parsed fields pre-filled.
// ✓ Accept / ✎ Edit / ✗ Discard. Nothing is silently filed.
export default function ProposalCard({
  inboxItemId,
  item,
  index,
}: {
  inboxItemId: string;
  item: AiProposalItem;
  index: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(item.title);
  const [roleKey, setRoleKey] = useState<RoleKey>(item.role_key);
  const [category, setCategory] = useState<ActionCategory>(item.category);
  const [priority, setPriority] = useState<ActionPriority>(item.priority);
  const [effort, setEffort] = useState<ActionEffort>(item.effort);
  const [dueDate, setDueDate] = useState(item.due_date ?? "");
  const [waitingOn, setWaitingOn] = useState(item.waiting_on ?? "");

  function accept() {
    startTransition(async () => {
      await acceptProposalItem(inboxItemId, index, {
        title,
        role_key: roleKey,
        category,
        priority,
        effort,
        due_date: dueDate || null,
        waiting_on: waitingOn || null,
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
      {!editing ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <span className="font-medium leading-snug">{title}</span>
            <RoleChip roleKey={roleKey} className="shrink-0" />
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-[var(--foreground-muted)]">
            <span>{CATEGORY_LABELS[category]}</span>
            <span>·</span>
            <span>{PRIORITY_LABELS[priority]}</span>
            <span>·</span>
            <span>{EFFORT_LABELS[effort]}</span>
            {dueDate && (
              <>
                <span>·</span>
                <span>Due {formatShortDate(dueDate)}</span>
              </>
            )}
            {waitingOn && (
              <>
                <span>·</span>
                <span>Waiting on {waitingOn}</span>
              </>
            )}
          </div>
          {item.milestone_title_match && (
            <p className="text-xs text-[var(--foreground-muted)]">
              Matched milestone: <span className="font-medium">{item.milestone_title_match}</span>
            </p>
          )}
          {item.subtasks.length > 0 && (
            <ul className="text-xs text-[var(--foreground-muted)] list-disc list-inside">
              {item.subtasks.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          <p className="text-[11px] uppercase tracking-wide text-[var(--foreground-muted)]">
            AI confidence: {item.confidence}
          </p>

          <div className="flex gap-2 pt-1">
            <button
              disabled={pending}
              onClick={accept}
              className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
            >
              ✓ Accept
            </button>
            <button
              disabled={pending}
              onClick={() => setEditing(true)}
              className="h-10 px-4 rounded-lg border border-[var(--border)] text-sm font-medium"
            >
              ✎ Edit
            </button>
            <button
              disabled={pending}
              onClick={discard}
              className="h-10 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]"
            >
              ✗ Discard
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={roleKey} onChange={(e) => setRoleKey(e.target.value as RoleKey)} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm">
              {ROLE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {ROLE_META[k].label}
                </option>
              ))}
            </select>
            <select value={category} onChange={(e) => setCategory(e.target.value as ActionCategory)} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm">
              {Object.entries(CATEGORY_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <select value={priority} onChange={(e) => setPriority(e.target.value as ActionPriority)} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm">
              {Object.entries(PRIORITY_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <select value={effort} onChange={(e) => setEffort(e.target.value as ActionEffort)} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm">
              {Object.entries(EFFORT_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm" />
            <input
              value={waitingOn}
              onChange={(e) => setWaitingOn(e.target.value)}
              placeholder="Waiting on…"
              className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              disabled={pending}
              onClick={accept}
              className="h-10 px-4 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50"
            >
              ✓ Accept
            </button>
            <button onClick={() => setEditing(false)} className="h-10 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
