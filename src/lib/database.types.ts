// Hand-written Supabase database typing (no live project to run
// `supabase gen types` against yet). Mirrors supabase/migrations/0001_init.sql.
// Regenerate properly with the Supabase CLI once a real project exists:
//   npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
import type {
  Action,
  Contact,
  Decision,
  DigestLog,
  InboxItem,
  MeetingNote,
  Milestone,
  PushSubscriptionRow,
  Recurrence,
  Resource,
  Role,
  Subtask,
} from "./types";

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row> & Record<string, unknown>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      roles: TableDef<Role>;
      milestones: TableDef<Milestone>;
      recurrences: TableDef<Recurrence>;
      actions: TableDef<Action>;
      subtasks: TableDef<Subtask>;
      inbox_items: TableDef<InboxItem>;
      contacts: TableDef<Contact>;
      meeting_notes: TableDef<MeetingNote>;
      decisions: TableDef<Decision>;
      resources: TableDef<Resource>;
      push_subscriptions: TableDef<PushSubscriptionRow>;
      digest_log: TableDef<DigestLog>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
