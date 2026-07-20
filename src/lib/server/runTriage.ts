import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropicClient, TRIAGE_MODEL } from "@/lib/anthropic";
import { buildTriageSystemPrompt, EMAIL_TRIAGE_EXTRA, parseTriageResponse } from "@/lib/triage";

/**
 * Runs the AI triage call for a given inbox_items row and stores the parsed
 * proposal back on the row. Shared by /api/triage (brain dump + retry) and
 * the future inbound-email webhook (phase 10).
 *
 * §5.1 step 4 / §5.2 step 5: parsing is defensive and never throws — on any
 * failure the inbox item is left with ai_proposal = null so the capture is
 * never lost, and the caller can offer manual conversion.
 */
export async function runTriageForInboxItem(
  supabase: SupabaseClient,
  inboxItemId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data: item, error: fetchErr } = await supabase
    .from("inbox_items")
    .select("*")
    .eq("id", inboxItemId)
    .single();

  if (fetchErr || !item) {
    return { ok: false, error: fetchErr?.message ?? "Inbox item not found" };
  }

  const [{ data: milestones }, { data: contacts }] = await Promise.all([
    supabase.from("milestones").select("title, role_key").neq("status", "complete"),
    supabase.from("contacts").select("name, role_title"),
  ]);

  const systemPrompt = buildTriageSystemPrompt(
    { milestones: milestones ?? [], contacts: contacts ?? [] },
    item.source === "email" ? EMAIL_TRIAGE_EXTRA : undefined
  );

  const userText =
    item.source === "email"
      ? `Subject: ${item.email_subject ?? "(no subject)"}\nFrom: ${item.email_from ?? "(unknown)"}\n\n${item.raw_text.slice(0, 4000)}`
      : item.raw_text;

  try {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: TRIAGE_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userText }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock && textBlock.type === "text" ? textBlock.text : "";
    const proposal = parseTriageResponse(raw);

    if (!proposal) {
      return { ok: false, error: "Could not parse a usable proposal from the AI response." };
    }

    const { error: updateErr } = await supabase
      .from("inbox_items")
      .update({ ai_proposal: proposal })
      .eq("id", inboxItemId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown triage error" };
  }
}
