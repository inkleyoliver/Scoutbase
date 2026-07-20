import { NextResponse } from "next/server";
import { createAdminClient, getOwnerId } from "@/lib/supabase/admin";
import { runTriageForInboxItem } from "@/lib/server/runTriage";
import { stripHtml } from "@/lib/htmlStrip";

const PROMPT_TRUNCATE_CHARS = 4000;

interface InboundEmailBody {
  subject?: string;
  from?: string;
  text?: string;
  html?: string;
}

/**
 * POST /api/inbound-email — §5.2. Verifies INBOUND_EMAIL_SECRET, creates an
 * inbox_items row (full text stored, only a ~4000-char slice goes to the
 * triage prompt — see runTriageForInboxItem), then runs the same triage
 * pipeline as a brain dump. Email NEVER auto-creates actions; proposals
 * always wait in the Inbox for confirmation (§1.6, §5.2 step 4).
 *
 * Designed for a Cloudflare Email Routing -> Worker that POSTs
 * { subject, from, text, html } with header `x-inbound-secret: <secret>`
 * (or `?secret=`). See README for the Worker setup. Resend Inbound's
 * webhook payload uses the same field names for subject/from/text/html so
 * this route works unchanged if that's used instead.
 */
export async function POST(request: Request) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || secret === "change-me") {
    return NextResponse.json({ error: "INBOUND_EMAIL_SECRET not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  const provided = request.headers.get("x-inbound-secret") ?? url.searchParams.get("secret");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: InboundEmailBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fullText = (body.text && body.text.trim()) || (body.html ? stripHtml(body.html) : "");
  if (!fullText.trim()) {
    return NextResponse.json({ error: "Email has no usable body text" }, { status: 400 });
  }

  const admin = createAdminClient();
  const ownerId = await getOwnerId(admin);
  if (!ownerId) {
    return NextResponse.json({ error: "Owner user not found" }, { status: 500 });
  }

  const { data: inboxRow, error: insertErr } = await admin
    .from("inbox_items")
    .insert({
      owner_id: ownerId,
      raw_text: fullText,
      source: "email",
      email_subject: body.subject ?? null,
      email_from: body.from ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertErr || !inboxRow) {
    return NextResponse.json({ error: insertErr?.message ?? "Failed to store email" }, { status: 500 });
  }

  // Triage prompt truncates to ~4000 chars internally (runTriageForInboxItem
  // slices item.raw_text); the full text above is already stored untouched.
  const triageResult = await runTriageForInboxItem(admin, inboxRow.id);

  return NextResponse.json({
    ok: true,
    inbox_item_id: inboxRow.id,
    triaged: triageResult.ok,
    truncated_for_prompt: fullText.length > PROMPT_TRUNCATE_CHARS,
  });
}
