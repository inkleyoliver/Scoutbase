import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLES = [
  "roles",
  "milestones",
  "recurrences",
  "actions",
  "subtasks",
  "inbox_items",
  "contacts",
  "meeting_notes",
  "decisions",
  "resources",
  "push_subscriptions",
  "user_settings",
] as const;

// GET /api/export — §7.6 one-click JSON export of all tables (backup
// safety valve). Uses the session-scoped client so RLS still applies —
// only the signed-in owner's rows ever come back.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await Promise.all(TABLES.map((t) => supabase.from(t).select("*")));

  const payload: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    owner_email: user.email,
  };
  TABLES.forEach((t, i) => {
    payload[t] = results[i].data ?? [];
  });

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="scoutbase-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
