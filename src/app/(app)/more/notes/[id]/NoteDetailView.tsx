"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import RoleChip from "@/components/RoleChip";
import { extractActionsFromNote, updateMeetingNote } from "@/lib/server/referenceMutations";
import { extractDocxNoteBody } from "@/lib/server/docxExtract";
import type { MeetingNote } from "@/lib/types";

export default function NoteDetailView({ note }: { note: MeetingNote }) {
  const router = useRouter();
  const [body, setBody] = useState(note.body ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractMessage, setExtractMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function uploadDocx(file: File) {
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    formData.set("file", file);
    const result = await extractDocxNoteBody(formData);
    setUploading(false);
    if (!result.ok) {
      setUploadError(result.error);
      return;
    }
    setBody((prev) => (prev.trim() ? `${prev}\n\n${result.text}` : result.text));
  }

  async function save() {
    setSaving(true);
    await updateMeetingNote({ id: note.id, body });
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function extract() {
    setExtracting(true);
    setExtractMessage(null);
    const result = await extractActionsFromNote(note.id);
    setExtracting(false);
    if (!result.ok) {
      setExtractMessage(result.error ?? "Could not extract actions.");
      return;
    }
    setExtractMessage(
      result.triaged
        ? "Sent to Inbox for review — check the Inbox tab for proposed actions."
        : "Sent to Inbox, but automatic sorting failed — you can convert it manually from the Inbox."
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl flex flex-col gap-5">
      <Link href="/more/notes" className="text-sm text-[var(--foreground-muted)] hover:underline">
        ← Meeting notes
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <RoleChip roleKey={note.role_key} />
          {note.meeting_date && <span className="text-xs text-[var(--foreground-muted)]">{note.meeting_date}</span>}
        </div>
        <h1 className="text-xl font-semibold">{note.title}</h1>
        {note.attendees && <p className="text-sm text-[var(--foreground-muted)]">Attendees: {note.attendees}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={extract}
          disabled={extracting}
          className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50"
        >
          {extracting ? "Extracting…" : "Extract actions"}
        </button>
        <button
          onClick={() => setEditing((v) => !v)}
          className="h-10 px-4 rounded-lg border border-[var(--border)] text-sm"
        >
          {editing ? "Cancel edit" : "Edit"}
        </button>
      </div>

      {extractMessage && <p className="text-sm text-[var(--foreground-muted)]">{extractMessage}</p>}

      {editing ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-xs text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer">
              {uploading ? "Reading…" : "Upload .docx"}
              <input
                type="file"
                accept=".docx"
                disabled={uploading}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadDocx(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {uploadError && <p className="text-sm text-[var(--overdue)]">{uploadError}</p>}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm resize-none font-mono"
          />
          <div className="flex justify-end">
            <button onClick={save} disabled={saving} className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <pre className="whitespace-pre-wrap font-sans text-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
          {note.body || "(no content)"}
        </pre>
      )}
    </div>
  );
}
