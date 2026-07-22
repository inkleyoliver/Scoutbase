"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runTriageForInboxItem } from "@/lib/server/runTriage";
import type { AiProposal, AiProposalItem } from "@/lib/types";

function revalidateInboxViews() {
  revalidatePath("/inbox");
  revalidatePath("/today");
  revalidatePath("/actions");
}

/**
 * §5.1 — capture is one tap + typing. Creates the inbox_items row, then
 * immediately runs triage. If triage fails, the row still exists with
 * ai_proposal = null: capture is never lost to an AI failure.
 */
export async function captureBrainDump(rawText: string) {
  const text = rawText.trim();
  if (!text) return { ok: false as const, error: "Nothing to capture." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inbox_items")
    .insert({ raw_text: text, source: "brain_dump", status: "pending" })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false as const, error: error?.message ?? "Failed to save capture" };
  }

  const triageResult = await runTriageForInboxItem(supabase, data.id);
  revalidateInboxViews();

  return { ok: true as const, id: data.id as string, triaged: triageResult.ok };
}

export async function retryTriage(inboxItemId: string) {
  const supabase = await createClient();
  const result = await runTriageForInboxItem(supabase, inboxItemId);
  revalidateInboxViews();
  return result;
}

async function findMilestoneId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roleKey: string,
  title: string | null
): Promise<string | null> {
  if (!title) return null;
  const { data } = await supabase
    .from("milestones")
    .select("id, title, role_key")
    .eq("role_key", roleKey)
    .ilike("title", title)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

async function createActionFromProposalItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  item: AiProposalItem,
  inboxItemId: string,
  explicitMilestoneId?: string | null
) {
  const milestone_id =
    explicitMilestoneId !== undefined
      ? explicitMilestoneId
      : item.confidence === "high"
        ? await findMilestoneId(supabase, item.role_key, item.milestone_title_match)
        : null;

  const { data, error } = await supabase
    .from("actions")
    .insert({
      title: item.title,
      role_key: item.role_key,
      category: item.category,
      priority: item.priority,
      effort: item.effort,
      status: item.waiting_on ? "waiting" : "open",
      due_date: item.due_date,
      waiting_on: item.waiting_on,
      waiting_since: item.waiting_on ? new Date().toISOString().slice(0, 10) : null,
      milestone_id,
      source: "brain_dump",
      source_ref: inboxItemId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const, error: error?.message };

  if (item.subtasks.length > 0) {
    await supabase.from("subtasks").insert(
      item.subtasks.map((title, i) => ({ action_id: data.id, title, sort_order: i }))
    );
  }

  return { ok: true as const, id: data.id as string };
}

async function removeProposalItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  inboxItemId: string,
  index: number
) {
  const { data: item } = await supabase
    .from("inbox_items")
    .select("ai_proposal, status")
    .eq("id", inboxItemId)
    .single();

  if (!item?.ai_proposal) return;

  const proposal = item.ai_proposal as AiProposal;
  const remaining = proposal.items.filter((_, i) => i !== index);
  const newProposal: AiProposal = { ...proposal, items: remaining };

  await supabase
    .from("inbox_items")
    .update({
      ai_proposal: newProposal,
      status: remaining.length === 0 ? "processed" : "pending",
    })
    .eq("id", inboxItemId);
}

export async function acceptProposalItem(
  inboxItemId: string,
  index: number,
  edited?: Partial<AiProposalItem> & { milestone_id?: string | null }
) {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("inbox_items")
    .select("ai_proposal")
    .eq("id", inboxItemId)
    .single();

  const proposal = item?.ai_proposal as AiProposal | null;
  const original = proposal?.items[index];
  if (!original) return { ok: false as const, error: "Proposal item not found" };

  const { milestone_id: explicitMilestoneId, ...editedFields } = edited ?? {};
  const merged: AiProposalItem = { ...original, ...editedFields };
  const result = await createActionFromProposalItem(supabase, merged, inboxItemId, explicitMilestoneId);
  if (!result.ok) return result;

  await removeProposalItem(supabase, inboxItemId, index);
  revalidateInboxViews();
  return { ok: true as const, actionId: result.id };
}

export async function discardProposalItem(inboxItemId: string, index: number) {
  const supabase = await createClient();
  await removeProposalItem(supabase, inboxItemId, index);
  revalidateInboxViews();
  return { ok: true as const };
}

export async function acceptAllProposalItems(inboxItemId: string) {
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("inbox_items")
    .select("ai_proposal")
    .eq("id", inboxItemId)
    .single();

  const proposal = item?.ai_proposal as AiProposal | null;
  if (!proposal || proposal.items.length === 0) return { ok: true as const };

  for (const proposalItem of proposal.items) {
    await createActionFromProposalItem(supabase, proposalItem, inboxItemId);
  }

  await supabase
    .from("inbox_items")
    .update({ ai_proposal: { ...proposal, items: [] }, status: "processed" })
    .eq("id", inboxItemId);

  revalidateInboxViews();
  return { ok: true as const };
}

export async function dismissInboxItem(inboxItemId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("inbox_items").update({ status: "dismissed" }).eq("id", inboxItemId);
  if (error) return { ok: false as const, error: error.message };
  revalidateInboxViews();
  return { ok: true as const };
}

/** Manual conversion path when AI triage failed (ai_proposal is null). */
export async function convertInboxItemManually(
  inboxItemId: string,
  fields: {
    title: string;
    role_key: AiProposalItem["role_key"];
    category?: AiProposalItem["category"];
    priority?: AiProposalItem["priority"];
    effort?: AiProposalItem["effort"];
    due_date?: string | null;
  }
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("actions")
    .insert({
      title: fields.title.trim(),
      role_key: fields.role_key,
      category: fields.category ?? "other",
      priority: fields.priority ?? "normal",
      effort: fields.effort ?? "medium",
      status: "open",
      due_date: fields.due_date ?? null,
      source: "brain_dump",
      source_ref: inboxItemId,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const, error: error?.message };

  await supabase.from("inbox_items").update({ status: "processed" }).eq("id", inboxItemId);
  revalidateInboxViews();
  return { ok: true as const, id: data.id as string };
}
