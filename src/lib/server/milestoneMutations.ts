"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MilestoneStatus, RoleKey } from "@/lib/types";

function revalidateMilestoneViews() {
  revalidatePath("/plan");
  revalidatePath("/actions");
  revalidatePath("/today");
}

export interface CreateMilestoneInput {
  title: string;
  role_key: RoleKey;
  description?: string | null;
  theme?: string | null;
  target_date?: string | null;
}

export async function createMilestone(input: CreateMilestoneInput) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("milestones")
    .insert({
      title: input.title.trim(),
      role_key: input.role_key,
      description: input.description ?? null,
      theme: input.theme?.trim() || null,
      target_date: input.target_date ?? null,
      status: "not_started",
      sort_order: 0,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const, error: error?.message ?? "Failed to create milestone" };
  revalidateMilestoneViews();
  return { ok: true as const, id: data.id as string };
}

export interface UpdateMilestoneInput {
  id: string;
  title?: string;
  description?: string | null;
  theme?: string | null;
  target_date?: string | null;
  status?: MilestoneStatus;
}

export async function updateMilestone(input: UpdateMilestoneInput) {
  const supabase = await createClient();
  const { id, ...patch } = input;
  const { error } = await supabase.from("milestones").update(patch).eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateMilestoneViews();
  return { ok: true as const };
}

export async function setMilestoneStatus(id: string, status: MilestoneStatus) {
  return updateMilestone({ id, status });
}

// Attached actions aren't deleted with the milestone — milestone_id is
// `on delete set null` (supabase/migrations/0001_init.sql), so they just
// become unlinked, still visible in Actions/Today.
export async function deleteMilestone(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("milestones").delete().eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidateMilestoneViews();
  return { ok: true as const };
}
