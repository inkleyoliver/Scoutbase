"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionCategory, ActionEffort, RecurrenceRule, RoleKey } from "@/lib/types";

function revalidateRecurrenceViews() {
  revalidatePath("/more/settings");
  revalidatePath("/today");
  revalidatePath("/actions");
}

export interface CreateRecurrenceInput {
  title: string;
  role_key: RoleKey;
  category?: ActionCategory;
  effort?: ActionEffort;
  notes?: string | null;
  rule: RecurrenceRule;
  byweekday?: number | null;
  bymonthday?: number | null;
  month?: number | null;
  day?: number | null;
  next_due: string;
}

export async function createRecurrence(input: CreateRecurrenceInput) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurrences").insert({
    title: input.title.trim(),
    role_key: input.role_key,
    category: input.category ?? "other",
    effort: input.effort ?? "medium",
    notes: input.notes || null,
    rule: input.rule,
    byweekday: input.byweekday ?? null,
    bymonthday: input.bymonthday ?? null,
    month: input.month ?? null,
    day: input.day ?? null,
    next_due: input.next_due,
    active: true,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidateRecurrenceViews();
  return { ok: true as const };
}

export interface UpdateRecurrenceInput {
  id: string;
  title?: string;
  role_key?: RoleKey;
  category?: ActionCategory;
  effort?: ActionEffort;
  notes?: string | null;
  next_due?: string;
  active?: boolean;
}

export async function updateRecurrence(input: UpdateRecurrenceInput) {
  const supabase = await createClient();
  const { id, ...patch } = input;
  const { error } = await supabase.from("recurrences").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateRecurrenceViews();
  return { ok: true as const };
}

export async function setRecurrenceActive(id: string, active: boolean) {
  return updateRecurrence({ id, active });
}

export async function deleteRecurrence(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("recurrences").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateRecurrenceViews();
  return { ok: true as const };
}
