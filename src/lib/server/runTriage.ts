import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropicClient, TRIAGE_MODEL } from "@/lib/anthropic";
import { buildTriageSystemPrompt, parseTriageResponse } from "@/lib/triage";
import { buildFallbackTriageProposal } from "@/lib/triageFallback";

function hasRealAnthropicKey(): boolean {
  const key = process.env.ANTHROPIC_API_KEY;
  return !!key && !key.includes("placeholder");
}

/**
 * Runs the AI triage call for a given inbox_items row and stores the parsed
 * proposal back on the row. Used by /api/triage (brain dump capture + retry)
 * — inbox_items only ever come from brain dumps now (inbound email capture
 * was removed).
 *
 * §5.1 step 4: parsing is defensive and never throws — on any failure the
 * inbox item is left with ai_proposal = null so the capture is never lost,
 * and the caller can offer manual conversion.
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

  const systemPrompt = buildTriageSystemPrompt({ milestones: milestones ?? [], contacts: contacts ?? [] });

  const userText = item.raw_text;

  // No real Anthropic key configured: this is the production default (Oli
  // has chosen not to pay for an API key), not just a demo-mode fallback.
  // Skip the network call entirely and use the deterministic keyword
  // heuristic instead so the capture -> triage -> inbox flow always works
  // for free. The moment a real ANTHROPIC_API_KEY is set, this branch stops
  // being taken and the real Anthropic call below runs instead — no other
  // code change needed to upgrade.
  if (!hasRealAnthropicKey()) {
    const proposal = buildFallbackTriageProposal(userText);
    const { error: updateErr } = await supabase
      .from("inbox_items")
      .update({ ai_proposal: proposal })
      .eq("id", inboxItemId);
    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }
    return { ok: true };
  }

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
