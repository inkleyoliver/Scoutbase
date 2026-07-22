import { NextResponse } from "next/server";
import { createAdminClient, getOwnerId } from "@/lib/supabase/admin";
import { ROLE_META } from "@/lib/constants";
import { addDays, toISODate } from "@/lib/date";
import type { Action } from "@/lib/types";

// GET /api/calendar.ics?token=... — a subscribable read-only iCalendar
// feed of every open/waiting action with a due date, for Apple/Google
// Calendar etc. Calendar apps poll this unauthenticated (no session
// cookie), so it's gated by a long random token instead — knowledge of
// the URL is the auth, same shape as the cron/webhook secrets (§11).
export async function GET(request: Request) {
  const secret = process.env.CALENDAR_FEED_SECRET;
  if (!secret || secret === "change-me") {
    return NextResponse.json({ error: "CALENDAR_FEED_SECRET not configured" }, { status: 500 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const ownerId = await getOwnerId(admin);
  if (!ownerId) {
    return NextResponse.json({ error: "Owner user not found" }, { status: 200 });
  }

  const { data } = await admin
    .from("actions")
    .select("*")
    .eq("owner_id", ownerId)
    .in("status", ["open", "waiting"])
    .not("due_date", "is", null);

  const actions = (data ?? []) as Action[];
  const body = buildIcs(actions);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="scoutbase.ics"',
    },
  });
}

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function icsDate(iso: string): string {
  return iso.replace(/-/g, "");
}

function stamp(): string {
  return new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function buildIcs(actions: Action[]): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Scoutbase//Calendar Feed//EN", "CALSCALE:GREGORIAN"];

  for (const a of actions) {
    if (!a.due_date) continue;
    const end = toISODate(addDays(a.due_date, 1));
    const summary = `[${ROLE_META[a.role_key].label}] ${a.title}`;
    lines.push(
      "BEGIN:VEVENT",
      `UID:scoutbase-action-${a.id}@scoutbase`,
      `DTSTAMP:${stamp()}`,
      `DTSTART;VALUE=DATE:${icsDate(a.due_date)}`,
      `DTEND;VALUE=DATE:${icsDate(end)}`,
      `SUMMARY:${icsEscape(summary)}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
