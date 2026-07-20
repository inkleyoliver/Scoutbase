import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/server/cronAuth";
import { createAdminClient, getOwnerId } from "@/lib/supabase/admin";
import { addDays, toISODate, todayISO } from "@/lib/date";
import { AUTO_ARCHIVE_DAYS } from "@/lib/constants";

// GET /api/cron/auto-archive — daily, see vercel.json.
// §7.3: done items auto-archive after 14 days. Open items are NEVER
// auto-archived here — only prompted via the staleness badge (§1.6).
export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const ownerId = await getOwnerId(admin);
  if (!ownerId) {
    return NextResponse.json({ ok: false, error: "Owner user not found" }, { status: 200 });
  }

  const cutoff = toISODate(addDays(todayISO(), -AUTO_ARCHIVE_DAYS));

  const { data, error } = await admin
    .from("actions")
    .update({ status: "archived" })
    .eq("owner_id", ownerId)
    .eq("status", "done")
    .lt("completed_at", `${cutoff}T00:00:00Z`)
    .select("id");

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 200 });

  return NextResponse.json({ ok: true, archived: data?.length ?? 0 });
}
