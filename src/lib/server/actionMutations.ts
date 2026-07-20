"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addDays, toISODate, todayISO } from "@/lib/date";
import type { ActionCategory, ActionEffort, ActionPriority, ActionStatus, RoleKey } from "@/lib/types";

export interface CreateActionInput {
  title: string;
  role_key: RoleKey;
  category?: ActionCategory;
  priority?: ActionPriority;
  effort?: ActionEffort;
  due_date?: string | null;
  notes?: string | null;
  milestone_id?: string | null;
  waiting_on?: string | null;
  subtasks?: string[];
  source?: "manual" | "brain_dump" | "email" | "recurring";
  source_ref?: string | null;
}

function revalidateActionViews() {
  revalidatePath("/today");
  revalidatePath("/actions");
  revalidatePath("/inbox");
}

export async function createAction(input: CreateActionInput) {
  const supabase = await createClient();
  const { subtasks, ...rest } = input;

  const status: ActionStatus = rest.waiting_on ? "waiting" : "open";

  const { data, error } = await supabase
    .from("actions")
    .insert({
      title: rest.title.trim(),
      role_key: rest.role_key,
      category: rest.category ?? "other",
      priority: rest.priority ?? "normal",
      effort: rest.effort ?? "medium",
      status,
      due_date: rest.due_date ?? null,
      notes: rest.notes ?? null,
      milestone_id: rest.milestone_id ?? null,
      waiting_on: rest.waiting_on ?? null,
      waiting_since: rest.waiting_on ? todayISO() : null,
      source: rest.source ?? "manual",
      source_ref: rest.source_ref ?? null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Failed to create action" };
  }

  if (subtasks && subtasks.length > 0) {
    await supabase.from("subtasks").insert(
      subtasks
        .filter((t) => t.trim())
        .map((title, i) => ({ action_id: data.id, title: title.trim(), sort_order: i }))
    );
  }

  revalidateActionViews();
  return { ok: true as const, id: data.id as string };
}

export interface UpdateActionInput {
  id: string;
  title?: string;
  role_key?: RoleKey;
  category?: ActionCategory;
  priority?: ActionPriority;
  effort?: ActionEffort;
  status?: ActionStatus;
  due_date?: string | null;
  notes?: string | null;
  milestone_id?: string | null;
  waiting_on?: string | null;
  snoozed_until?: string | null;
}

export async function updateAction(input: UpdateActionInput) {
  const supabase = await createClient();
  const { id, ...patch } = input;

  const finalPatch: Record<string, unknown> = { ...patch };

  if ("waiting_on" in patch) {
    finalPatch.waiting_since = patch.waiting_on ? todayISO() : null;
    if (patch.waiting_on && !patch.status) {
      finalPatch.status = "waiting";
    }
  }

  if (patch.status === "done") {
    finalPatch.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("actions").update(finalPatch).eq("id", id);

  if (error) return { ok: false as const, error: error.message };

  revalidateActionViews();
  return { ok: true as const };
}

export async function markActionDone(id: string) {
  return updateAction({ id, status: "done" });
}

export async function archiveAction(id: string) {
  return updateAction({ id, status: "archived" });
}

export async function reopenAction(id: string) {
  return updateAction({ id, status: "open" });
}

export type SnoozeOption = "tomorrow" | "3days" | "nextweek" | { date: string };

export async function snoozeAction(id: string, option: SnoozeOption) {
  let until: string;
  const today = todayISO();
  if (option === "tomorrow") until = toISODate(addDays(today, 1));
  else if (option === "3days") until = toISODate(addDays(today, 3));
  else if (option === "nextweek") until = toISODate(addDays(today, 7));
  else until = option.date;

  return updateAction({ id, snoozed_until: until });
}

export async function unsnoozeAction(id: string) {
  return updateAction({ id, snoozed_until: null });
}

/**
 * §7.3 "Still real?" staleness prompt — "Yes, keep" resets the 21-day
 * clock without changing anything else about the action. This is the one
 * place we touch last_activity_at directly rather than relying on the
 * status/notes trigger (see supabase/migrations/0002_staleness.sql).
 */
export async function markActionStillReal(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("actions").update({ last_activity_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateActionViews();
  return { ok: true as const };
}

export async function snoozeActionOneMonth(id: string) {
  const until = toISODate(addDays(todayISO(), 30));
  return snoozeAction(id, { date: until });
}

export async function deleteActionPermanently(id: string) {
  // Not exposed in the UI (spec: nothing silently deleted) — archive is the
  // supported "remove" path. Kept only for admin/debug use.
  const supabase = await createClient();
  const { error } = await supabase.from("actions").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateActionViews();
  return { ok: true as const };
}

export async function addSubtask(actionId: string, title: string, sortOrder = 0) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("subtasks")
    .insert({ action_id: actionId, title: title.trim(), sort_order: sortOrder });
  if (error) return { ok: false as const, error: error.message };
  revalidateActionViews();
  return { ok: true as const };
}

export async function toggleSubtask(id: string, done: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("subtasks").update({ done }).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateActionViews();
  return { ok: true as const };
}

export async function deleteSubtask(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("subtasks").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateActionViews();
  return { ok: true as const };
}
