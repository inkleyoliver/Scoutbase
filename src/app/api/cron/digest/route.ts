import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/server/cronAuth";
import { createAdminClient, getOwnerId } from "@/lib/supabase/admin";
import { buildDigest } from "@/lib/server/buildDigest";
import { renderDigestHtml, renderDigestSubject } from "@/lib/server/digestEmail";
import { getResendClient, getDigestFrom } from "@/lib/resend";
import { todayISO } from "@/lib/date";

// GET /api/cron/digest — daily at 07:00 Europe/London, see vercel.json.
// §8.1: skip the send if nothing to say, and log to digest_log so we never
// double-send (checked by date, not just "has a row today" in case the cron
// is retried).
export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const ownerId = await getOwnerId(admin);
  if (!ownerId) {
    return NextResponse.json({ ok: false, error: "Owner user not found" }, { status: 200 });
  }

  const { data: settings } = await admin.from("user_settings").select("digest_enabled").eq("owner_id", ownerId).maybeSingle();
  if (settings && settings.digest_enabled === false) {
    return NextResponse.json({ ok: true, skipped: "digest disabled" });
  }

  const today = todayISO();
  const { data: alreadySent } = await admin
    .from("digest_log")
    .select("id")
    .eq("owner_id", ownerId)
    .gte("sent_at", `${today}T00:00:00Z`)
    .lt("sent_at", `${today}T23:59:59Z`)
    .limit(1)
    .maybeSingle();

  if (alreadySent) {
    return NextResponse.json({ ok: true, skipped: "already sent today" });
  }

  const digest = await buildDigest(admin, ownerId);
  if (!digest) {
    return NextResponse.json({ ok: true, skipped: "nothing to say" });
  }

  const weekday = new Date().toLocaleDateString("en-GB", { weekday: "long", timeZone: "Europe/London" });
  const subject = renderDigestSubject(weekday, digest.topFive.length);
  const html = renderDigestHtml(digest, weekday);

  const { data: authUser } = await admin.auth.admin.getUserById(ownerId);
  const toEmail = authUser?.user?.email;

  if (!toEmail) {
    return NextResponse.json({ ok: false, error: "No email on owner account" }, { status: 200 });
  }

  try {
    await getResendClient().emails.send({ from: getDigestFrom(), to: toEmail, subject, html });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Resend send failed" }, { status: 200 });
  }

  await admin.from("digest_log").insert({
    owner_id: ownerId,
    summary: {
      top_five: digest.topFive.length,
      waiting_chases: digest.waitingChases.length,
      stale_count: digest.staleCount,
      skew_message: digest.skewMessage,
      inbox_pending_count: digest.inboxPendingCount,
    },
  });

  return NextResponse.json({ ok: true, sent: true });
}
