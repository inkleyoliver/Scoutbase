import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runTriageForInboxItem } from "@/lib/server/runTriage";

// POST /api/triage { inbox_item_id: string }
// Server-side only — never expose ANTHROPIC_API_KEY to the client (§2, §11).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { inbox_item_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.inbox_item_id) {
    return NextResponse.json({ error: "inbox_item_id is required" }, { status: 400 });
  }

  const result = await runTriageForInboxItem(supabase, body.inbox_item_id);

  if (!result.ok) {
    // Not a 500: this is an expected, handled outcome. The inbox item still
    // exists with ai_proposal = null; the UI offers manual conversion.
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
