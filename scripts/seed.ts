/**
 * Scoutbase seed script — §14 seed data checklist.
 *
 * Run with: npx tsx scripts/seed.ts
 *
 * Requires real values in .env.local for NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY and ALLOWED_USER_EMAIL. Uses the service role
 * key to bypass RLS and looks up the allow-listed user's id via the
 * Supabase Admin API, so that user must already exist (sign up once in the
 * app, or create the user in the Supabase dashboard, before seeding).
 *
 * Safe to re-run: it checks for existing rows (by unique-ish keys) before
 * inserting, so it won't duplicate data on a second run.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ALLOWED_EMAIL = process.env.ALLOWED_USER_EMAIL;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ALLOWED_EMAIL) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ALLOWED_USER_EMAIL in .env.local"
  );
  process.exit(1);
}

if (SUPABASE_URL.includes("placeholder") || SERVICE_ROLE_KEY.includes("placeholder")) {
  console.error(
    "Refusing to seed: .env.local still has placeholder Supabase values. Fill in real credentials first."
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findOwnerId(): Promise<string> {
  // Admin listUsers is paginated; a single-user project only needs page 1.
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === ALLOWED_EMAIL!.toLowerCase());
  if (!user) {
    throw new Error(
      `No auth user found for ${ALLOWED_EMAIL}. Sign up once in the app (or create the user in the Supabase dashboard) before seeding.`
    );
  }
  return user.id;
}

async function main() {
  const owner_id = await findOwnerId();
  console.log(`Seeding as owner_id ${owner_id} (${ALLOWED_EMAIL})`);

  // ---- 3 roles -------------------------------------------------------
  await admin.from("roles").upsert(
    [
      { owner_id, key: "gsl", label: "GSL", color: "#4C1D95" },
      { owner_id, key: "explorers", label: "Explorers", color: "#0F766E" },
      { owner_id, key: "both", label: "Personal", color: "#6B7280" },
    ],
    { onConflict: "key" }
  );
  console.log("Roles ok");

  // ---- Milestones: 8-10 GSL across themes, 3 Explorer ----------------
  const { data: existingMilestones } = await admin.from("milestones").select("title");
  const existingTitles = new Set((existingMilestones ?? []).map((m) => m.title));

  const gslMilestones = [
    { title: "Governance reset", theme: "governance", target_date: "2026-09-30" },
    { title: "Trustee board fully recruited", theme: "governance", target_date: "2026-10-31" },
    { title: "Section leader recruitment drive", theme: "recruitment", target_date: "2026-11-30" },
    { title: "Waiting list cleared", theme: "recruitment", target_date: "2027-03-31" },
    { title: "New Beavers colony launched", theme: "section-growth", target_date: "2027-01-31" },
    { title: "Programme quality review across sections", theme: "programme", target_date: "2026-12-31" },
    { title: "Hall lease renewed", theme: "governance", target_date: "2026-08-31" },
    { title: "10-year group vision published", theme: "vision", target_date: "2027-06-30" },
    { title: "Group census & compliance up to date", theme: "governance", target_date: "2026-08-01" },
  ];

  const explorerMilestones = [
    { title: "Young leaders scheme relaunched", theme: "programme", target_date: "2026-10-01" },
    { title: "Summer expedition planned & booked", theme: "programme", target_date: "2027-03-01" },
    { title: "Unit council established", theme: "section-growth", target_date: "2026-11-01" },
  ];

  const milestoneRows = [
    ...gslMilestones.map((m, i) => ({
      owner_id,
      role_key: "gsl",
      title: m.title,
      description: null,
      theme: m.theme,
      target_date: m.target_date,
      status: "not_started",
      sort_order: i,
    })),
    ...explorerMilestones.map((m, i) => ({
      owner_id,
      role_key: "explorers",
      title: m.title,
      description: null,
      theme: m.theme,
      target_date: m.target_date,
      status: "not_started",
      sort_order: i,
    })),
  ].filter((m) => !existingTitles.has(m.title));

  if (milestoneRows.length > 0) {
    const { error } = await admin.from("milestones").insert(milestoneRows);
    if (error) throw error;
  }
  console.log(`Milestones ok (${milestoneRows.length} inserted)`);

  const { data: allMilestones } = await admin.from("milestones").select("id, title");
  const milestoneIdByTitle = new Map((allMilestones ?? []).map((m) => [m.title, m.id]));

  // ---- 5 sample recurrences (§6) --------------------------------------
  const { data: existingRecurrences } = await admin.from("recurrences").select("title");
  const existingRecurrenceTitles = new Set((existingRecurrences ?? []).map((r) => r.title));

  const recurrences = [
    {
      role_key: "explorers",
      title: "Explorer programme prep + comms",
      category: "comms",
      effort: "medium",
      rule: "weekly",
      byweekday: 0,
      next_due: nextWeekday(1),
    },
    {
      role_key: "gsl",
      title: "GSL inbox + chase sweep",
      category: "admin",
      effort: "quick",
      rule: "weekly",
      byweekday: 0,
      next_due: nextWeekday(1),
    },
    {
      role_key: "gsl",
      title: "Trustee/exec update note",
      category: "governance",
      effort: "medium",
      rule: "monthly",
      bymonthday: 1,
      next_due: firstOfNextMonth(),
    },
    {
      role_key: "explorers",
      title: "Programme planning session",
      category: "programme",
      effort: "big",
      rule: "termly",
      next_due: addDays(90),
    },
    {
      role_key: "gsl",
      title: "Annual census/returns",
      category: "admin",
      effort: "big",
      rule: "yearly",
      month: 1,
      day: 31,
      next_due: "2027-01-31",
    },
  ]
    .filter((r) => !existingRecurrenceTitles.has(r.title))
    .map((r) => ({ ...r, owner_id, notes: null, active: true }));

  if (recurrences.length > 0) {
    const { error } = await admin.from("recurrences").insert(recurrences);
    if (error) throw error;
  }
  console.log(`Recurrences ok (${recurrences.length} inserted)`);

  // ---- Contacts: 2 per role --------------------------------------------
  const { data: existingContacts } = await admin.from("contacts").select("name");
  const existingContactNames = new Set((existingContacts ?? []).map((c) => c.name));

  const contacts = [
    { role_key: "gsl", name: "Dave Whitfield", role_title: "Trustee — Treasurer", email: null, phone: null },
    { role_key: "gsl", name: "Priya Anand", role_title: "District Commissioner", email: null, phone: null },
    { role_key: "explorers", name: "Sam Ilic", role_title: "Explorer Unit Chair", email: null, phone: null },
    { role_key: "explorers", name: "Jo Fenwick", role_title: "Young Leader Coordinator", email: null, phone: null },
  ]
    .filter((c) => !existingContactNames.has(c.name))
    .map((c) => ({ ...c, owner_id, notes: null }));

  if (contacts.length > 0) {
    const { error } = await admin.from("contacts").insert(contacts);
    if (error) throw error;
  }
  console.log(`Contacts ok (${contacts.length} inserted)`);

  // ---- 1 meeting note ----------------------------------------------------
  const { data: existingNotes } = await admin
    .from("meeting_notes")
    .select("title")
    .eq("title", "Trustee board — governance reset kickoff");

  let meetingNoteId: string | null = existingNotes?.[0]
    ? ((await admin
        .from("meeting_notes")
        .select("id")
        .eq("title", "Trustee board — governance reset kickoff")
        .single()).data?.id ?? null)
    : null;

  if (!meetingNoteId) {
    const { data, error } = await admin
      .from("meeting_notes")
      .insert({
        owner_id,
        role_key: "gsl",
        title: "Trustee board — governance reset kickoff",
        meeting_date: "2026-07-10",
        body: "## Agenda\n- Structural reform overview\n- Trustee recruitment gaps\n- Hall lease renewal timeline\n\n## Notes\nAgreed to prioritise trustee recruitment and hall lease renewal before the AGM.",
        attendees: "Dave Whitfield, Priya Anand, Oli",
      })
      .select("id")
      .single();
    if (error) throw error;
    meetingNoteId = data.id;
    console.log("Meeting note ok (inserted)");
  } else {
    console.log("Meeting note ok (already existed)");
  }

  // ---- 1 decision --------------------------------------------------------
  const { data: existingDecisions } = await admin
    .from("decisions")
    .select("title")
    .eq("title", "Adopt phased trustee recruitment plan");

  if (!existingDecisions || existingDecisions.length === 0) {
    const { error } = await admin.from("decisions").insert({
      owner_id,
      role_key: "gsl",
      title: "Adopt phased trustee recruitment plan",
      decided_on: "2026-07-10",
      decided_by: "Trustees",
      detail: "Agreed to recruit 2 trustees this term, 2 next term, rather than all at once.",
      meeting_note_id: meetingNoteId,
      superseded_by: null,
    });
    if (error) throw error;
  }
  console.log("Decisions ok");

  // ---- 3 library resources ------------------------------------------------
  const { data: existingResources } = await admin.from("resources").select("title");
  const existingResourceTitles = new Set((existingResources ?? []).map((r) => r.title));

  const resources = [
    {
      role_key: "both",
      title: "Policy, Organisation and Rules (POR)",
      url: "https://www.scouts.org.uk/por/",
      category: "policy",
    },
    {
      role_key: "both",
      title: "Scouts.org.uk — Safety & safeguarding policies",
      url: "https://www.scouts.org.uk/policy-organisation-and-rules/policies/",
      category: "policy",
    },
    {
      role_key: "both",
      title: "Online Scout Manager (OSM) login",
      url: "https://www.onlinescoutmanager.co.uk/",
      category: "osm",
    },
  ]
    .filter((r) => !existingResourceTitles.has(r.title))
    .map((r) => ({ ...r, owner_id, notes: null }));

  if (resources.length > 0) {
    const { error } = await admin.from("resources").insert(resources);
    if (error) throw error;
  }
  console.log(`Resources ok (${resources.length} inserted)`);

  // ---- 6 sample actions spread across roles/categories ---------------
  const { data: existingActions } = await admin.from("actions").select("title");
  const existingActionTitles = new Set((existingActions ?? []).map((a) => a.title));

  const actions = [
    {
      role_key: "gsl",
      title: "Chase Dave about the hall lease",
      category: "governance",
      priority: "high",
      effort: "quick",
      status: "waiting",
      due_date: null,
      waiting_on: "Dave",
      waiting_since: addDays(-9),
      milestone_title: "Hall lease renewed",
    },
    {
      role_key: "gsl",
      title: "Draft trustee recruitment advert",
      category: "people",
      priority: "normal",
      effort: "medium",
      status: "open",
      due_date: addDays(5),
      milestone_title: "Trustee board fully recruited",
    },
    {
      role_key: "explorers",
      title: "Book minibus for summer expedition",
      category: "admin",
      priority: "urgent",
      effort: "quick",
      status: "open",
      due_date: addDays(1),
      milestone_title: "Summer expedition planned & booked",
    },
    {
      role_key: "explorers",
      title: "Plan this term's programme nights",
      category: "programme",
      priority: "normal",
      effort: "big",
      status: "open",
      due_date: addDays(-2),
    },
    {
      role_key: "both",
      title: "Renew DBS check",
      category: "admin",
      priority: "high",
      effort: "quick",
      status: "open",
      due_date: addDays(14),
    },
    {
      role_key: "gsl",
      title: "Send AGM date to section leaders",
      category: "comms",
      priority: "normal",
      effort: "quick",
      status: "open",
      due_date: null,
    },
  ]
    .filter((a) => !existingActionTitles.has(a.title))
    .map(({ milestone_title, ...a }) => ({
      ...a,
      owner_id,
      notes: null,
      source: "manual" as const,
      source_ref: null,
      completed_at: null,
      snoozed_until: null,
      recurrence_id: null,
      milestone_id: milestone_title ? milestoneIdByTitle.get(milestone_title) ?? null : null,
    }));

  if (actions.length > 0) {
    const { error } = await admin.from("actions").insert(actions);
    if (error) throw error;
  }
  console.log(`Actions ok (${actions.length} inserted)`);

  console.log("\nSeed complete.");
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function nextWeekday(dayOfWeek: number): string {
  const d = new Date();
  const diff = (dayOfWeek + 7 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function firstOfNextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
