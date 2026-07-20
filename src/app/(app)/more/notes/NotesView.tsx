"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import RoleChip from "@/components/RoleChip";
import { useFocusMode } from "@/components/FocusModeContext";
import { FOCUS_MODE_TO_ROLE_KEY } from "@/lib/constants";
import { createMeetingNote } from "@/lib/server/referenceMutations";
import type { MeetingNote, RoleKey } from "@/lib/types";

export default function NotesView({ notes }: { notes: MeetingNote[] }) {
  const { focusMode } = useFocusMode();
  const roleFilter = FOCUS_MODE_TO_ROLE_KEY[focusMode];
  const [showNew, setShowNew] = useState(false);

  const filtered = roleFilter ? notes.filter((n) => n.role_key === roleFilter) : notes;

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-xl">
      <Link href="/more" className="text-sm text-[var(--foreground-muted)] hover:underline">
        ← More
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Meeting notes</h1>
        <button onClick={() => setShowNew(true)} className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium">
          + New note
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)] py-8 text-center">No meeting notes yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((n) => (
            <Link key={n.id} href={`/more/notes/${n.id}`} className="flex flex-col gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <RoleChip roleKey={n.role_key} />
                {n.meeting_date && <span className="text-xs text-[var(--foreground-muted)]">{n.meeting_date}</span>}
              </div>
              <span className="font-medium">{n.title}</span>
              {n.attendees && <span className="text-xs text-[var(--foreground-muted)]">{n.attendees}</span>}
            </Link>
          ))}
        </div>
      )}

      {showNew && (
        <Modal title="New meeting note" onClose={() => setShowNew(false)}>
          <NewNoteForm defaultRole={roleFilter ?? undefined} onDone={() => setShowNew(false)} />
        </Modal>
      )}
    </div>
  );
}

function NewNoteForm({ defaultRole, onDone }: { defaultRole?: RoleKey; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>(defaultRole ?? "gsl");
  const [meetingDate, setMeetingDate] = useState("");
  const [attendees, setAttendees] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setError("Give it a title.");
      return;
    }
    setPending(true);
    const result = await createMeetingNote({
      title,
      role_key: roleKey,
      meeting_date: meetingDate || null,
      attendees: attendees || null,
      body: body || null,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
    if (result.id) router.push(`/more/notes/${result.id}`);
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
          <label className="text-sm font-medium">Meeting date</label>
          <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Attendees</label>
        <input value={attendees} onChange={(e) => setAttendees(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Notes (markdown)</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm resize-none font-mono" />
      </div>
      {error && <p className="text-sm text-[var(--overdue)]">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="h-11 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]">Cancel</button>
        <button type="button" onClick={submit} disabled={pending} className="h-11 px-5 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50">
          {pending ? "Saving…" : "Add note"}
        </button>
      </div>
    </div>
  );
}
