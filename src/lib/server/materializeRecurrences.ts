import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, toISODate, todayISO } from "@/lib/date";
import type { Recurrence } from "@/lib/types";

const LEAD_DAYS = 7;
const MAX_OCCURRENCES_PER_RUN = 6; // safety cap if a recurrence hasn't run in a long time

function advanceNextDue(r: Pick<Recurrence, "rule" | "next_due" | "month" | "day">): string {
  const current = new Date(r.next_due + "T00:00:00");
  switch (r.rule) {
    case "weekly":
      return toISODate(addDays(r.next_due, 7));
    case "monthly": {
      const d = new Date(current);
      d.setMonth(d.getMonth() + 1);
      return toISODate(d);
    }
    case "termly":
      // Three fixed dates/year, user-editable (§6) — approximate as +4 months.
      return toISODate(addDays(r.next_due, 120));
    case "yearly": {
      const d = new Date(current);
      d.setFullYear(d.getFullYear() + 1);
      return toISODate(d);
    }
    default:
      return toISODate(addDays(r.next_due, 30));
  }
}

/**
 * §4.5 / §7 build order item 7 — daily cron materialises an `actions` row
 * when `next_due <= today + lead_days`, then advances `next_due`. Never
 * duplicates: checks for an existing non-archived action with the same
 * recurrence_id + due_date first. Owner-scoped, expects a service-role
 * client (see src/lib/supabase/admin.ts) since cron has no session.
 */
export async function materializeRecurrencesForOwner(
  supabase: SupabaseClient,
  ownerId: string
): Promise<{ created: number; advanced: number }> {
  const horizon = toISODate(addDays(todayISO(), LEAD_DAYS));

  const { data: recurrences } = await supabase
    .from("recurrences")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("active", true)
    .lte("next_due", horizon);

  let created = 0;
  let advanced = 0;

  for (const r of (recurrences ?? []) as Recurrence[]) {
    let nextDue = r.next_due;
    let iterations = 0;

    while (nextDue <= horizon && iterations < MAX_OCCURRENCES_PER_RUN) {
      iterations++;

      const { data: existing } = await supabase
        .from("actions")
        .select("id")
        .eq("owner_id", ownerId)
        .eq("recurrence_id", r.id)
        .eq("due_date", nextDue)
        .neq("status", "archived")
        .limit(1)
        .maybeSingle();

      if (!existing) {
        const { error: insertErr } = await supabase.from("actions").insert({
          owner_id: ownerId,
          role_key: r.role_key,
          title: r.title,
          notes: r.notes,
          category: r.category,
          effort: r.effort,
          priority: "normal",
          status: "open",
          due_date: nextDue,
          source: "recurring",
          source_ref: r.id,
          recurrence_id: r.id,
        });
        if (!insertErr) created++;
      }

      nextDue = advanceNextDue({ ...r, next_due: nextDue });
    }

    if (nextDue !== r.next_due) {
      await supabase.from("recurrences").update({ next_due: nextDue }).eq("id", r.id);
      advanced++;
    }
  }

  return { created, advanced };
}
