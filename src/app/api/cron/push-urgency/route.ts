import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/server/cronAuth";
import { createAdminClient, getOwnerId } from "@/lib/supabase/admin";
import { sendPushToOwner } from "@/lib/server/webpush";
import { daysSince, todayISO } from "@/lib/date";
import type { Action } from "@/lib/types";

const DAILY_PUSH_CAP = 2;
const DUE_TODAY_PUSH_HOUR = 8; // London hour to send the "due today" nudge (§8.2: 08:30-ish, hourly cron)
const WAITING_CHASE_DAYS = 14;

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
}

// GET /api/cron/push-urgency — hourly, see vercel.json.
// §8.2: due-today nudge once/day, urgent items once ever, waiting-on >= 14
// days once ever per item. Hard cap 2 pushes/day total across all kinds.
export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const admin = createAdminClient();
  const ownerId = await getOwnerId(admin);
  if (!ownerId) {
    return NextResponse.json({ ok: false, error: "Owner user not found" }, { status: 200 });
  }

  const today = todayISO();
  const londonHour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/London" }).format(new Date())
  );

  const { count: sentTodayCount } = await admin
    .from("push_log")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .gte("sent_at", `${today}T00:00:00Z`)
    .lt("sent_at", `${today}T23:59:59Z`);

  let remainingCap = DAILY_PUSH_CAP - (sentTodayCount ?? 0);
  const sentKinds: string[] = [];

  if (remainingCap <= 0) {
    return NextResponse.json({ ok: true, skipped: "daily push cap reached" });
  }

  const { data: openActions } = await admin
    .from("actions")
    .select("*")
    .eq("owner_id", ownerId)
    .in("status", ["open", "waiting"]);

  const actions = (openActions ?? []) as Action[];

  // 1. Due-today nudge, once per day, only in the designated hour.
  if (remainingCap > 0 && londonHour === DUE_TODAY_PUSH_HOUR) {
    const { data: alreadySent } = await admin
      .from("push_log")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("kind", "due_today")
      .gte("sent_at", `${today}T00:00:00Z`)
      .maybeSingle();

    const dueToday = actions.filter((a) => a.due_date === today && a.status !== "done");
    if (!alreadySent && dueToday.length > 0) {
      const { sent } = await sendPushToOwner(admin, ownerId, {
        title: `${dueToday.length} due today`,
        body: dueToday.map((a) => a.title).slice(0, 3).join(", "),
        url: `${appUrl()}/today`,
      });
      if (sent > 0) {
        await admin.from("push_log").insert({ owner_id: ownerId, kind: "due_today", ref_id: null });
        remainingCap--;
        sentKinds.push("due_today");
      }
    }
  }

  // 2. Urgent priority items — once ever per item.
  const urgentItems = actions.filter((a) => a.priority === "urgent");
  for (const a of urgentItems) {
    if (remainingCap <= 0) break;
    const { data: alreadySent } = await admin
      .from("push_log")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("kind", "urgent")
      .eq("ref_id", a.id)
      .maybeSingle();
    if (alreadySent) continue;

    const { sent } = await sendPushToOwner(admin, ownerId, {
      title: "Urgent",
      body: a.title,
      url: `${appUrl()}/actions/${a.id}`,
    });
    if (sent > 0) {
      await admin.from("push_log").insert({ owner_id: ownerId, kind: "urgent", ref_id: a.id });
      remainingCap--;
      sentKinds.push("urgent");
    }
  }

  // 3. Waiting-on >= 14 days — max one push per item, ever.
  const staleChases = actions.filter(
    (a) => a.status === "waiting" && a.waiting_since && (daysSince(a.waiting_since) ?? 0) >= WAITING_CHASE_DAYS
  );
  for (const a of staleChases) {
    if (remainingCap <= 0) break;
    const { data: alreadySent } = await admin
      .from("push_log")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("kind", "waiting_chase")
      .eq("ref_id", a.id)
      .maybeSingle();
    if (alreadySent) continue;

    const { sent } = await sendPushToOwner(admin, ownerId, {
      title: "Still waiting",
      body: `${a.title}${a.waiting_on ? ` — ${a.waiting_on}` : ""}`,
      url: `${appUrl()}/actions/${a.id}`,
    });
    if (sent > 0) {
      await admin.from("push_log").insert({ owner_id: ownerId, kind: "waiting_chase", ref_id: a.id });
      remainingCap--;
      sentKinds.push("waiting_chase");
    }
  }

  return NextResponse.json({ ok: true, sentKinds });
}
