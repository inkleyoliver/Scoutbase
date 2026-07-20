"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import RoleChip from "@/components/RoleChip";
import { useFocusMode } from "@/components/FocusModeContext";
import { FOCUS_MODE_TO_ROLE_KEY } from "@/lib/constants";
import { createDecision } from "@/lib/server/referenceMutations";
import type { Decision, RoleKey } from "@/lib/types";

export default function DecisionsView({
  decisions,
  notes,
}: {
  decisions: Decision[];
  notes: { id: string; title: string }[];
}) {
  const { focusMode } = useFocusMode();
  const roleFilter = FOCUS_MODE_TO_ROLE_KEY[focusMode];
  const [showNew, setShowNew] = useState(false);

  const byId = useMemo(() => new Map(decisions.map((d) => [d.id, d])), [decisions]);
  const filtered = roleFilter ? decisions.filter((d) => d.role_key === roleFilter) : decisions;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-xl">
      <Link href="/more" className="text-sm text-[var(--foreground-muted)] hover:underline">
        ← More
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Decisions log</h1>
        <button onClick={() => setShowNew(true)} className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium">
          + New decision
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)] py-8 text-center">No decisions logged yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((d) => {
            const supersededByTitle = d.superseded_by ? byId.get(d.superseded_by)?.title : null;
            return (
              <div key={d.id} className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <RoleChip roleKey={d.role_key} />
                  {d.decided_on && <span className="text-xs text-[var(--foreground-muted)]">{d.decided_on}</span>}
                  {d.decided_by && <span className="text-xs text-[var(--foreground-muted)]">· {d.decided_by}</span>}
                </div>
                <span className="font-medium">{d.title}</span>
                {d.detail && <p className="text-sm text-[var(--foreground-muted)]">{d.detail}</p>}
                {supersededByTitle && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">Superseded by: {supersededByTitle}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <Modal title="New decision" onClose={() => setShowNew(false)}>
          <NewDecisionForm defaultRole={roleFilter ?? undefined} notes={notes} decisions={decisions} onDone={() => setShowNew(false)} />
        </Modal>
      )}
    </div>
  );
}

function NewDecisionForm({
  defaultRole,
  notes,
  decisions,
  onDone,
}: {
  defaultRole?: RoleKey;
  notes: { id: string; title: string }[];
  decisions: Decision[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>(defaultRole ?? "gsl");
  const [decidedOn, setDecidedOn] = useState("");
  const [decidedBy, setDecidedBy] = useState("");
  const [detail, setDetail] = useState("");
  const [meetingNoteId, setMeetingNoteId] = useState("");
  const [supersededBy, setSupersededBy] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setError("Give it a title.");
      return;
    }
    setPending(true);
    const result = await createDecision({
      title,
      role_key: roleKey,
      decided_on: decidedOn || null,
      decided_by: decidedBy || null,
      detail: detail || null,
      meeting_note_id: meetingNoteId || null,
      supersedes_decision_id: supersededBy || null,
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
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Role</label>
          <select value={roleKey} onChange={(e) => setRoleKey(e.target.value as RoleKey)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
            <option value="gsl">GSL</option>
            <option value="explorers">Explorers</option>
            <option value="both">Both / Personal</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Decided on</label>
          <input type="date" value={decidedOn} onChange={(e) => setDecidedOn(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Decided by</label>
          <input value={decidedBy} onChange={(e) => setDecidedBy(e.target.value)} placeholder="e.g. Trustees" className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Linked meeting note</label>
          <select value={meetingNoteId} onChange={(e) => setMeetingNoteId(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
            <option value="">None</option>
            {notes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Detail</label>
        <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={3} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm resize-none" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">This decision supersedes…</label>
        <select value={supersededBy} onChange={(e) => setSupersededBy(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
          <option value="">No</option>
          {decisions.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-sm text-[var(--overdue)]">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="h-11 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]">Cancel</button>
        <button type="button" onClick={submit} disabled={pending} className="h-11 px-5 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50">
          {pending ? "Saving…" : "Add decision"}
        </button>
      </div>
    </div>
  );
}
