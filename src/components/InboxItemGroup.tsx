"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ProposalCard from "./ProposalCard";
import { ROLE_META } from "@/lib/constants";
import {
  acceptProposalItem,
  convertInboxItemManually,
  dismissInboxItem,
  retryTriage,
} from "@/lib/server/inboxMutations";
import type { InboxItem, RoleKey } from "@/lib/types";

export default function InboxItemGroup({
  item,
  roleFilter = null,
}: {
  item: InboxItem;
  roleFilter?: RoleKey | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [manualTitle, setManualTitle] = useState(item.raw_text.slice(0, 80));
  const [manualRole, setManualRole] = useState<RoleKey>("both");

  const proposal = item.ai_proposal;
  const indexedItems = (proposal?.items ?? []).map((it, i) => ({ it, i }));
  const visibleIndexedItems = roleFilter
    ? indexedItems.filter(({ it }) => it.role_key === roleFilter)
    : indexedItems;
  const hasItems = visibleIndexedItems.length > 0;
  const hasNotesOnly =
    !!proposal && proposal.items.length === 0 && proposal.non_action_notes.length > 0 && !roleFilter;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs uppercase tracking-wide text-[var(--foreground-muted)]">
            {item.source === "email" ? `Email — ${item.email_subject ?? "no subject"}` : "Brain dump"}
          </p>
          <p className="text-sm text-[var(--foreground-muted)] whitespace-pre-wrap line-clamp-3">{item.raw_text}</p>
        </div>
        <button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await dismissInboxItem(item.id);
              router.refresh();
            })
          }
          className="shrink-0 text-xs text-[var(--foreground-muted)] hover:text-[var(--overdue)]"
        >
          Dismiss
        </button>
      </div>

      {hasItems && (
        <>
          <div className="flex justify-end">
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  // Process highest index first: accepting removes that
                  // item from the DB array, so lower indices stay valid.
                  const descending = [...visibleIndexedItems].sort((a, b) => b.i - a.i);
                  for (const { i } of descending) {
                    await acceptProposalItem(item.id, i);
                  }
                  router.refresh();
                })
              }
              className="h-9 px-3 rounded-lg bg-[#4C1D95] text-white text-xs font-medium disabled:opacity-50"
            >
              Accept all ({visibleIndexedItems.length})
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {visibleIndexedItems.map(({ it, i }) => (
              <ProposalCard key={`${item.id}-${i}`} inboxItemId={item.id} item={it} index={i} />
            ))}
          </div>
        </>
      )}

      {hasNotesOnly && (
        <div className="flex flex-col gap-1 text-sm text-[var(--foreground-muted)]">
          <p>No actions found — just notes:</p>
          <ul className="list-disc list-inside">
            {proposal!.non_action_notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}

      {!proposal && item.status === "pending" && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[var(--border)] p-3">
          <p className="text-sm text-[var(--foreground-muted)]">
            AI triage didn&apos;t return a usable result. Your capture is safe — retry, or file it manually.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await retryTriage(item.id);
                  router.refresh();
                })
              }
              className="h-9 px-3 rounded-lg border border-[var(--border)] text-xs font-medium"
            >
              Retry triage
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="h-9 flex-1 min-w-[10rem] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
            />
            <select
              value={manualRole}
              onChange={(e) => setManualRole(e.target.value as RoleKey)}
              className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
            >
              {(Object.keys(ROLE_META) as RoleKey[]).map((k) => (
                <option key={k} value={k}>
                  {ROLE_META[k].label}
                </option>
              ))}
            </select>
            <button
              disabled={pending || !manualTitle.trim()}
              onClick={() =>
                startTransition(async () => {
                  await convertInboxItemManually(item.id, { title: manualTitle, role_key: manualRole });
                  router.refresh();
                })
              }
              className="h-9 px-3 rounded-lg bg-[#4C1D95] text-white text-xs font-medium disabled:opacity-50"
            >
              Create action
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
