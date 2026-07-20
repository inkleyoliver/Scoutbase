// In-memory seed data for DEMO_MODE (see src/lib/demo/mockSupabaseClient.ts).
// Mirrors supabase/migrations/0001_init.sql column shapes closely enough for
// every page/mutation built in phases 1-12 to render and behave sensibly.
// Not real data, not persisted anywhere — resets whenever the dev server
// restarts. Dates are computed relative to "now" at import time so the demo
// always looks current (overdue / due-today / due-soon / stale) regardless
// of when it's actually run.

export const DEMO_OWNER_ID = "00000000-0000-0000-0000-000000000001";

function uid(): string {
  return crypto.randomUUID();
}

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

function isoTimestamp(daysFromToday: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString();
}

const now = isoTimestamp(0);

// ---------------------------------------------------------------------------
// roles
// ---------------------------------------------------------------------------
export const roles = [
  { id: uid(), owner_id: DEMO_OWNER_ID, key: "gsl", label: "GSL", color: "#4C1D95", created_at: now, updated_at: now },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    key: "explorers",
    label: "Explorers",
    color: "#0F766E",
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    key: "both",
    label: "Both / Personal",
    color: "#6B7280",
    created_at: now,
    updated_at: now,
  },
];

// ---------------------------------------------------------------------------
// milestones
// ---------------------------------------------------------------------------
const milestoneSeed = [
  { role_key: "gsl", title: "Governance reset", theme: "governance", target_date: isoDate(70), status: "in_progress" },
  {
    role_key: "gsl",
    title: "Trustee board fully recruited",
    theme: "governance",
    target_date: isoDate(100),
    status: "in_progress",
  },
  {
    role_key: "gsl",
    title: "Hall lease renewed",
    theme: "governance",
    target_date: isoDate(40),
    status: "not_started",
  },
  {
    role_key: "gsl",
    title: "Section leader recruitment drive",
    theme: "recruitment",
    target_date: isoDate(130),
    status: "not_started",
  },
  {
    role_key: "explorers",
    title: "Summer expedition planned & booked",
    theme: "programme",
    target_date: isoDate(90),
    status: "in_progress",
  },
  {
    role_key: "explorers",
    title: "Young leaders scheme relaunched",
    theme: "programme",
    target_date: isoDate(80),
    status: "not_started",
  },
  {
    role_key: "explorers",
    title: "Unit council established",
    theme: "section-growth",
    target_date: isoDate(-10),
    status: "parked",
  },
];

export const milestones = milestoneSeed.map((m, i) => ({
  id: uid(),
  owner_id: DEMO_OWNER_ID,
  role_key: m.role_key,
  title: m.title,
  description: null as string | null,
  theme: m.theme,
  target_date: m.target_date,
  status: m.status,
  sort_order: i,
  created_at: now,
  updated_at: now,
}));

function milestoneId(title: string): string | null {
  return milestones.find((m) => m.title === title)?.id ?? null;
}

// ---------------------------------------------------------------------------
// recurrences
// ---------------------------------------------------------------------------
export const recurrences = [
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "explorers",
    title: "Explorer programme prep + comms",
    category: "comms",
    effort: "medium",
    notes: null as string | null,
    rule: "weekly",
    byweekday: 0,
    bymonthday: null as number | null,
    month: null as number | null,
    day: null as number | null,
    next_due: isoDate(3),
    active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "gsl",
    title: "GSL inbox + chase sweep",
    category: "admin",
    effort: "quick",
    notes: null as string | null,
    rule: "weekly",
    byweekday: 0,
    bymonthday: null as number | null,
    month: null as number | null,
    day: null as number | null,
    next_due: isoDate(0),
    active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "gsl",
    title: "Trustee/exec update note",
    category: "governance",
    effort: "medium",
    notes: null as string | null,
    rule: "monthly",
    byweekday: null as number | null,
    bymonthday: 1,
    month: null as number | null,
    day: null as number | null,
    next_due: isoDate(12),
    active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "gsl",
    title: "Annual census/returns",
    category: "admin",
    effort: "big",
    notes: null as string | null,
    rule: "yearly",
    byweekday: null as number | null,
    bymonthday: null as number | null,
    month: 1,
    day: 31,
    next_due: "2027-01-31",
    active: true,
    created_at: now,
    updated_at: now,
  },
];

// ---------------------------------------------------------------------------
// actions
// ---------------------------------------------------------------------------
interface SeedAction {
  title: string;
  role_key: string;
  category: string;
  priority: string;
  effort: string;
  status: string;
  due_date: string | null;
  waiting_on: string | null;
  waiting_since: string | null;
  source: string;
  source_ref: string | null;
  completed_at: string | null;
  snoozed_until: string | null;
  recurrence_id: string | null;
  milestone_id: string | null;
  last_activity_at: string;
  notes: string | null;
}

const actionSeed: SeedAction[] = [
  {
    title: "Book minibus for summer expedition",
    role_key: "explorers",
    category: "admin",
    priority: "urgent",
    effort: "quick",
    status: "open",
    due_date: isoDate(0),
    waiting_on: null,
    waiting_since: null,
    source: "manual",
    source_ref: null,
    completed_at: null,
    snoozed_until: null,
    recurrence_id: null,
    milestone_id: milestoneId("Summer expedition planned & booked"),
    last_activity_at: now,
    notes: null,
  },
  {
    title: "GSL inbox + chase sweep",
    role_key: "gsl",
    category: "admin",
    priority: "normal",
    effort: "quick",
    status: "open",
    due_date: isoDate(0),
    waiting_on: null,
    waiting_since: null,
    source: "recurring",
    source_ref: null,
    completed_at: null,
    snoozed_until: null,
    recurrence_id: recurrences[1].id,
    milestone_id: null,
    last_activity_at: now,
    notes: null,
  },
  {
    title: "Draft trustee recruitment advert",
    role_key: "gsl",
    category: "people",
    priority: "normal",
    effort: "medium",
    status: "open",
    due_date: isoDate(2),
    waiting_on: null,
    waiting_since: null,
    source: "manual",
    source_ref: null,
    completed_at: null,
    snoozed_until: null,
    recurrence_id: null,
    milestone_id: milestoneId("Trustee board fully recruited"),
    last_activity_at: now,
    notes: null,
  },
  {
    title: "Plan this term's programme nights",
    role_key: "explorers",
    category: "programme",
    priority: "high",
    effort: "big",
    status: "open",
    due_date: isoDate(-2),
    waiting_on: null,
    waiting_since: null,
    source: "manual",
    source_ref: null,
    completed_at: null,
    snoozed_until: null,
    recurrence_id: null,
    milestone_id: null,
    last_activity_at: isoTimestamp(-3),
    notes: null,
  },
  {
    title: "Chase Dave about the hall lease",
    role_key: "gsl",
    category: "governance",
    priority: "high",
    effort: "quick",
    status: "waiting",
    due_date: null,
    waiting_on: "Dave",
    waiting_since: isoDate(-9),
    source: "manual",
    source_ref: null,
    completed_at: null,
    snoozed_until: null,
    recurrence_id: null,
    milestone_id: milestoneId("Hall lease renewed"),
    last_activity_at: isoTimestamp(-9),
    notes: null,
  },
  {
    title: "Review safeguarding policy update",
    role_key: "both",
    category: "admin",
    priority: "low",
    effort: "quick",
    status: "open",
    due_date: null,
    waiting_on: null,
    waiting_since: null,
    source: "manual",
    source_ref: null,
    completed_at: null,
    snoozed_until: null,
    recurrence_id: null,
    milestone_id: null,
    last_activity_at: isoTimestamp(-27),
    notes: "Untouched for a while — good example of the staleness prompt.",
  },
  {
    title: "Renew DBS check",
    role_key: "both",
    category: "admin",
    priority: "high",
    effort: "quick",
    status: "open",
    due_date: isoDate(14),
    waiting_on: null,
    waiting_since: null,
    source: "manual",
    source_ref: null,
    completed_at: null,
    snoozed_until: null,
    recurrence_id: null,
    milestone_id: null,
    last_activity_at: now,
    notes: null,
  },
  {
    title: "Send AGM date to section leaders",
    role_key: "gsl",
    category: "comms",
    priority: "normal",
    effort: "quick",
    status: "open",
    due_date: null,
    waiting_on: null,
    waiting_since: null,
    source: "manual",
    source_ref: null,
    completed_at: null,
    snoozed_until: null,
    recurrence_id: null,
    milestone_id: null,
    last_activity_at: now,
    notes: null,
  },
  {
    title: "Plan summer camp menu",
    role_key: "explorers",
    category: "programme",
    priority: "normal",
    effort: "medium",
    status: "open",
    due_date: isoDate(10),
    waiting_on: null,
    waiting_since: null,
    source: "manual",
    source_ref: null,
    completed_at: null,
    snoozed_until: null,
    recurrence_id: null,
    milestone_id: milestoneId("Summer expedition planned & booked"),
    last_activity_at: now,
    notes: null,
  },
  {
    title: "Governance reset kickoff pack",
    role_key: "gsl",
    category: "governance",
    priority: "normal",
    effort: "big",
    status: "open",
    due_date: isoDate(21),
    waiting_on: null,
    waiting_since: null,
    source: "manual",
    source_ref: null,
    completed_at: null,
    snoozed_until: null,
    recurrence_id: null,
    milestone_id: milestoneId("Governance reset"),
    last_activity_at: now,
    notes: null,
  },
  {
    title: "Confirm First Response course dates",
    role_key: "both",
    category: "admin",
    priority: "low",
    effort: "quick",
    status: "done",
    due_date: isoDate(-1),
    waiting_on: null,
    waiting_since: null,
    source: "manual",
    source_ref: null,
    completed_at: isoTimestamp(0),
    snoozed_until: null,
    recurrence_id: null,
    milestone_id: null,
    last_activity_at: now,
    notes: null,
  },
];

export const actions = actionSeed.map((a) => ({
  id: uid(),
  owner_id: DEMO_OWNER_ID,
  created_at: now,
  updated_at: now,
  ...a,
}));

function actionId(title: string): string {
  const a = actions.find((x) => x.title === title);
  if (!a) throw new Error(`seed: no action titled "${title}"`);
  return a.id;
}

// ---------------------------------------------------------------------------
// subtasks
// ---------------------------------------------------------------------------
export const subtasks = [
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    action_id: actionId("Plan summer camp menu"),
    title: "Get dietary requirements from parents",
    done: true,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    action_id: actionId("Plan summer camp menu"),
    title: "Cost out shopping list",
    done: false,
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    action_id: actionId("Plan summer camp menu"),
    title: "Confirm gas/stove availability",
    done: false,
    sort_order: 2,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    action_id: actionId("Governance reset kickoff pack"),
    title: "Draft terms of reference",
    done: true,
    sort_order: 0,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    action_id: actionId("Governance reset kickoff pack"),
    title: "Circulate to trustees for comment",
    done: false,
    sort_order: 1,
    created_at: now,
    updated_at: now,
  },
];

// ---------------------------------------------------------------------------
// inbox_items — a couple with AI proposals already populated, one that
// still needs (re)triage so the "retry" / manual-conversion path has
// something to show too.
// ---------------------------------------------------------------------------
export const inboxItems = [
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    raw_text:
      "Need to email Priya about the section leader recruitment drive before end of month, and chase the minibus quote for the summer expedition.",
    source: "brain_dump",
    email_subject: null as string | null,
    email_from: null as string | null,
    ai_proposal: {
      items: [
        {
          title: "Email Priya about section leader recruitment drive",
          role_key: "gsl",
          category: "people",
          priority: "normal",
          effort: "quick",
          due_date: isoDate(11),
          waiting_on: null,
          milestone_title_match: "Section leader recruitment drive",
          subtasks: [],
          confidence: "high",
        },
        {
          title: "Chase minibus quote for summer expedition",
          role_key: "explorers",
          category: "admin",
          priority: "normal",
          effort: "quick",
          due_date: null,
          waiting_on: null,
          milestone_title_match: "Summer expedition planned & booked",
          subtasks: [],
          confidence: "high",
        },
      ],
      non_action_notes: [],
    },
    status: "pending",
    created_at: isoTimestamp(0),
    updated_at: isoTimestamp(0),
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    raw_text:
      "Hi, following up on last week's trustee meeting — can you send over the hall lease paperwork when you get a chance? Thanks, Dave",
    source: "email",
    email_subject: "RE: Trustee meeting notes",
    email_from: "dave@example.org",
    ai_proposal: {
      items: [
        {
          title: "Send hall lease paperwork to Dave",
          role_key: "gsl",
          category: "governance",
          priority: "normal",
          effort: "quick",
          due_date: null,
          waiting_on: null,
          milestone_title_match: "Hall lease renewed",
          subtasks: [],
          confidence: "medium",
        },
      ],
      non_action_notes: ["Follow-up from last week's trustee meeting."],
    },
    status: "pending",
    created_at: isoTimestamp(-1),
    updated_at: isoTimestamp(-1),
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    raw_text: "Random thought in the car — need to sort out the badge cupboard at some point, it's a mess.",
    source: "brain_dump",
    email_subject: null as string | null,
    email_from: null as string | null,
    ai_proposal: null as unknown,
    status: "pending",
    created_at: isoTimestamp(-2),
    updated_at: isoTimestamp(-2),
  },
];

// ---------------------------------------------------------------------------
// contacts
// ---------------------------------------------------------------------------
export const contacts = [
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "gsl",
    name: "Dave Whitfield",
    role_title: "Trustee — Treasurer",
    email: "dave@example.org",
    phone: null as string | null,
    notes: null as string | null,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "gsl",
    name: "Priya Anand",
    role_title: "District Commissioner",
    email: "priya@example.org",
    phone: null as string | null,
    notes: null as string | null,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "explorers",
    name: "Sam Ilic",
    role_title: "Explorer Unit Chair",
    email: null as string | null,
    phone: "07700 900123",
    notes: null as string | null,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "explorers",
    name: "Jo Fenwick",
    role_title: "Young Leader Coordinator",
    email: null as string | null,
    phone: null as string | null,
    notes: null as string | null,
    created_at: now,
    updated_at: now,
  },
];

// ---------------------------------------------------------------------------
// meeting_notes
// ---------------------------------------------------------------------------
export const meetingNotes = [
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "gsl",
    title: "Trustee board — governance reset kickoff",
    meeting_date: isoDate(-10),
    body:
      "## Agenda\n- Structural reform overview\n- Trustee recruitment gaps\n- Hall lease renewal timeline\n\n## Notes\nAgreed to prioritise trustee recruitment and hall lease renewal before the AGM.",
    attendees: "Dave Whitfield, Priya Anand, Oli",
    created_at: isoTimestamp(-10),
    updated_at: isoTimestamp(-10),
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "explorers",
    title: "Explorer unit council — term planning",
    meeting_date: isoDate(-3),
    body:
      "## Agenda\n- Summer expedition budget\n- Young leaders scheme relaunch\n\n## Notes\nSam to confirm minibus quotes; Jo to draft young leaders relaunch plan.",
    attendees: "Sam Ilic, Jo Fenwick, Oli",
    created_at: isoTimestamp(-3),
    updated_at: isoTimestamp(-3),
  },
];

// ---------------------------------------------------------------------------
// decisions — one superseded example
// ---------------------------------------------------------------------------
const decisionOldId = uid();
const decisionNewId = uid();

export const decisions = [
  {
    id: decisionOldId,
    owner_id: DEMO_OWNER_ID,
    role_key: "gsl",
    title: "Recruit all trustees in a single push",
    decided_on: isoDate(-60),
    decided_by: "Trustees",
    detail: "Original plan: recruit all 4 missing trustees at once ahead of the AGM.",
    meeting_note_id: null as string | null,
    superseded_by: decisionNewId as string | null,
    created_at: isoTimestamp(-60),
    updated_at: isoTimestamp(-10),
  },
  {
    id: decisionNewId,
    owner_id: DEMO_OWNER_ID,
    role_key: "gsl",
    title: "Adopt phased trustee recruitment plan",
    decided_on: isoDate(-10),
    decided_by: "Trustees",
    detail: "Agreed to recruit 2 trustees this term, 2 next term, rather than all at once.",
    meeting_note_id: meetingNotes[0].id,
    superseded_by: null as string | null,
    created_at: isoTimestamp(-10),
    updated_at: isoTimestamp(-10),
  },
];

// ---------------------------------------------------------------------------
// resources (library)
// ---------------------------------------------------------------------------
export const resources = [
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "both",
    title: "Policy, Organisation and Rules (POR)",
    url: "https://www.scouts.org.uk/por/",
    category: "policy",
    notes: null as string | null,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "both",
    title: "Scouts.org.uk — Safety & safeguarding policies",
    url: "https://www.scouts.org.uk/policy-organisation-and-rules/policies/",
    category: "policy",
    notes: null as string | null,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "both",
    title: "Online Scout Manager (OSM) login",
    url: "https://www.onlinescoutmanager.co.uk/",
    category: "osm",
    notes: null as string | null,
    created_at: now,
    updated_at: now,
  },
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    role_key: "explorers",
    title: "Expedition risk assessment template",
    url: null as string | null,
    category: "risk-assessment",
    notes: "Copy this before each new expedition.",
    created_at: now,
    updated_at: now,
  },
];

// ---------------------------------------------------------------------------
// push_subscriptions / digest_log / push_log — empty, populated only by
// interacting with Settings in demo mode.
// ---------------------------------------------------------------------------
export const pushSubscriptions: Array<Record<string, unknown>> = [];
export const digestLog: Array<Record<string, unknown>> = [];
export const pushLog: Array<Record<string, unknown>> = [];

// ---------------------------------------------------------------------------
// user_settings
// ---------------------------------------------------------------------------
export const userSettings = [
  {
    id: uid(),
    owner_id: DEMO_OWNER_ID,
    digest_enabled: false,
    digest_time: "07:30",
    focus_default: "All",
    created_at: now,
    updated_at: now,
  },
];

// ---------------------------------------------------------------------------
// The full store, keyed by table name — mutated in place by the mock
// query builder. Mutations persist for the life of the dev server process.
// ---------------------------------------------------------------------------
export type DemoTable =
  | "roles"
  | "milestones"
  | "recurrences"
  | "actions"
  | "subtasks"
  | "inbox_items"
  | "contacts"
  | "meeting_notes"
  | "decisions"
  | "resources"
  | "push_subscriptions"
  | "digest_log"
  | "push_log"
  | "user_settings";

// A module-level singleton store object. Using `globalThis` keeps state
// stable across Next.js's dev-mode module reloads (fast refresh would
// otherwise re-run this file and reset the demo data on every save).
interface DemoStore {
  roles: typeof roles;
  milestones: typeof milestones;
  recurrences: typeof recurrences;
  actions: typeof actions;
  subtasks: typeof subtasks;
  inbox_items: typeof inboxItems;
  contacts: typeof contacts;
  meeting_notes: typeof meetingNotes;
  decisions: typeof decisions;
  resources: typeof resources;
  push_subscriptions: typeof pushSubscriptions;
  digest_log: typeof digestLog;
  push_log: typeof pushLog;
  user_settings: typeof userSettings;
}

const globalForDemo = globalThis as unknown as { __scoutbaseDemoStore?: DemoStore };

export const demoStore: DemoStore =
  globalForDemo.__scoutbaseDemoStore ??
  (globalForDemo.__scoutbaseDemoStore = {
    roles,
    milestones,
    recurrences,
    actions,
    subtasks,
    inbox_items: inboxItems,
    contacts,
    meeting_notes: meetingNotes,
    decisions,
    resources,
    push_subscriptions: pushSubscriptions,
    digest_log: digestLog,
    push_log: pushLog,
    user_settings: userSettings,
  });
