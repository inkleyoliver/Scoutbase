"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runTriageForInboxItem } from "@/lib/server/runTriage";
import type { ResourceCategory, RoleKey } from "@/lib/types";

function revalidateReference() {
  revalidatePath("/more/contacts");
  revalidatePath("/more/notes");
  revalidatePath("/more/decisions");
  revalidatePath("/more/library");
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

export async function createContact(input: {
  name: string;
  role_key: RoleKey;
  role_title?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert({
    name: input.name.trim(),
    role_key: input.role_key,
    role_title: input.role_title || null,
    email: input.email || null,
    phone: input.phone || null,
    notes: input.notes || null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidateReference();
  return { ok: true as const };
}

export async function deleteContact(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateReference();
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Meeting notes
// ---------------------------------------------------------------------------

export async function createMeetingNote(input: {
  title: string;
  role_key: RoleKey;
  meeting_date?: string | null;
  body?: string | null;
  attendees?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meeting_notes")
    .insert({
      title: input.title.trim(),
      role_key: input.role_key,
      meeting_date: input.meeting_date || null,
      body: input.body || null,
      attendees: input.attendees || null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: error?.message };
  revalidateReference();
  return { ok: true as const, id: data.id as string };
}

export async function updateMeetingNote(input: {
  id: string;
  title?: string;
  meeting_date?: string | null;
  body?: string | null;
  attendees?: string | null;
}) {
  const supabase = await createClient();
  const { id, ...patch } = input;
  const { error } = await supabase.from("meeting_notes").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateReference();
  return { ok: true as const };
}

/**
 * §7.5 "Extract actions" — runs the note body through the SAME triage
 * pipeline (§5) as a brain dump, landing proposals in the Inbox for
 * confirmation. Never auto-creates actions.
 */
export async function extractActionsFromNote(noteId: string) {
  const supabase = await createClient();
  const { data: note, error: noteErr } = await supabase
    .from("meeting_notes")
    .select("title, body")
    .eq("id", noteId)
    .single();

  if (noteErr || !note) return { ok: false as const, error: noteErr?.message ?? "Note not found" };
  if (!note.body || !note.body.trim()) return { ok: false as const, error: "This note has no content to extract from." };

  const { data: inboxRow, error: insertErr } = await supabase
    .from("inbox_items")
    .insert({
      raw_text: `Meeting note: ${note.title}\n\n${note.body}`,
      source: "brain_dump",
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !inboxRow) return { ok: false as const, error: insertErr?.message };

  const triageResult = await runTriageForInboxItem(supabase, inboxRow.id);
  revalidateReference();
  revalidatePath("/inbox");
  return { ok: true as const, inboxItemId: inboxRow.id as string, triaged: triageResult.ok };
}

// ---------------------------------------------------------------------------
// Decisions
// ---------------------------------------------------------------------------

export async function createDecision(input: {
  title: string;
  role_key: RoleKey;
  decided_on?: string | null;
  decided_by?: string | null;
  detail?: string | null;
  meeting_note_id?: string | null;
  /** id of an earlier decision this new one supersedes (§4.9 superseded_by
   * lives on the OLD row and points at the new one — this input drives
   * updating that old row after insert, it is not stored on the new row). */
  supersedes_decision_id?: string | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("decisions")
    .insert({
      title: input.title.trim(),
      role_key: input.role_key,
      decided_on: input.decided_on || null,
      decided_by: input.decided_by || null,
      detail: input.detail || null,
      meeting_note_id: input.meeting_note_id || null,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, error: error?.message };

  if (input.supersedes_decision_id) {
    await supabase
      .from("decisions")
      .update({ superseded_by: data.id })
      .eq("id", input.supersedes_decision_id);
  }

  revalidateReference();
  return { ok: true as const, id: data.id as string };
}

// ---------------------------------------------------------------------------
// Resources (library)
// ---------------------------------------------------------------------------

export async function createResource(input: {
  title: string;
  role_key: RoleKey;
  url?: string | null;
  category?: ResourceCategory;
  notes?: string | null;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("resources").insert({
    title: input.title.trim(),
    role_key: input.role_key,
    url: input.url || null,
    category: input.category ?? "other",
    notes: input.notes || null,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidateReference();
  return { ok: true as const };
}

export async function deleteResource(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateReference();
  return { ok: true as const };
}
