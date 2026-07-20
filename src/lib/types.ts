// Shared enum / domain types mirroring supabase/migrations/0001_init.sql.
// Keep these in sync with the SQL check constraints — later phases rely on
// these exact string values.

export type RoleKey = "gsl" | "explorers" | "both";

export type FocusMode = "All" | "GSL" | "Explorers";

export type MilestoneStatus = "not_started" | "in_progress" | "complete" | "parked";

export type ActionCategory = "governance" | "people" | "comms" | "programme" | "admin" | "other";

export type ActionPriority = "urgent" | "high" | "normal" | "low";

export type ActionEffort = "quick" | "medium" | "big";

export type ActionStatus = "open" | "waiting" | "done" | "archived";

export type ActionSource = "manual" | "brain_dump" | "email" | "recurring";

export type InboxSource = "brain_dump" | "email";

export type InboxStatus = "pending" | "processed" | "dismissed";

export type ResourceCategory = "policy" | "osm" | "risk-assessment" | "template" | "other";

export type RecurrenceRule = "weekly" | "monthly" | "termly" | "yearly";

export interface Role {
  id: string;
  owner_id: string;
  key: RoleKey;
  label: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  owner_id: string;
  role_key: RoleKey;
  title: string;
  description: string | null;
  theme: string | null;
  target_date: string | null;
  status: MilestoneStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Recurrence {
  id: string;
  owner_id: string;
  role_key: RoleKey;
  title: string;
  category: ActionCategory;
  effort: ActionEffort;
  notes: string | null;
  rule: RecurrenceRule;
  byweekday: number | null;
  bymonthday: number | null;
  month: number | null;
  day: number | null;
  next_due: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Action {
  id: string;
  owner_id: string;
  role_key: RoleKey;
  milestone_id: string | null;
  title: string;
  notes: string | null;
  category: ActionCategory;
  priority: ActionPriority;
  effort: ActionEffort;
  status: ActionStatus;
  due_date: string | null;
  waiting_on: string | null;
  waiting_since: string | null;
  source: ActionSource;
  source_ref: string | null;
  completed_at: string | null;
  snoozed_until: string | null;
  recurrence_id: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  owner_id: string;
  action_id: string;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AiProposalItem {
  title: string;
  role_key: RoleKey;
  category: ActionCategory;
  priority: ActionPriority;
  effort: ActionEffort;
  due_date: string | null;
  waiting_on: string | null;
  milestone_title_match: string | null;
  subtasks: string[];
  confidence: "high" | "medium" | "low";
}

export interface AiProposal {
  items: AiProposalItem[];
  non_action_notes: string[];
}

export interface InboxItem {
  id: string;
  owner_id: string;
  raw_text: string;
  source: InboxSource;
  email_subject: string | null;
  email_from: string | null;
  ai_proposal: AiProposal | null;
  status: InboxStatus;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  owner_id: string;
  role_key: RoleKey;
  name: string;
  role_title: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface MeetingNote {
  id: string;
  owner_id: string;
  role_key: RoleKey;
  title: string;
  meeting_date: string | null;
  body: string | null;
  attendees: string | null;
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  owner_id: string;
  role_key: RoleKey;
  title: string;
  decided_on: string | null;
  decided_by: string | null;
  detail: string | null;
  meeting_note_id: string | null;
  superseded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Resource {
  id: string;
  owner_id: string;
  role_key: RoleKey;
  title: string;
  url: string | null;
  category: ResourceCategory;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  owner_id: string;
  endpoint: string;
  keys: Record<string, string>;
  device_label: string | null;
  created_at: string;
  updated_at: string;
}

export interface DigestLog {
  id: string;
  owner_id: string;
  sent_at: string;
  summary: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ActionWithSubtasks extends Action {
  subtasks?: Subtask[];
}

export interface UserSettings {
  id: string;
  owner_id: string;
  digest_enabled: boolean;
  digest_time: string;
  focus_default: FocusMode;
  created_at: string;
  updated_at: string;
}

export type PushLogKind = "due_today" | "urgent" | "waiting_chase";

export interface PushLog {
  id: string;
  owner_id: string;
  kind: PushLogKind;
  ref_id: string | null;
  sent_at: string;
  created_at: string;
  updated_at: string;
}
