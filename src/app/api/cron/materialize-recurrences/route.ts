import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/server/cronAuth";
import { createAdminClient, getOwnerId } from "@/lib/supabase/admin";
import { materializeRecurrencesForOwner } from "@/lib/server/materializeRecurrences";

// GET /api/cron/materialize-recurrences — daily, see vercel.json.
// §12 build order 7: recurrence materialisation cron.
export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const ownerId = await getOwnerId(admin);
  if (!ownerId) {
    return NextResponse.json({ ok: false, error: "Owner user not found" }, { status: 200 });
  }

  const result = await materializeRecurrencesForOwner(admin, ownerId);
  return NextResponse.json({ ok: true, ...result });
}
