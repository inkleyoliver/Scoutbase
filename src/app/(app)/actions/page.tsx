import { createClient } from "@/lib/supabase/server";
import ActionsView from "./ActionsView";
import type { Subtask } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ActionsPage() {
  const supabase = await createClient();

  const [{ data: actions }, { data: subtasks }, { data: milestones }] = await Promise.all([
    supabase.from("actions").select("*").order("created_at", { ascending: false }),
    supabase.from("subtasks").select("*").order("sort_order", { ascending: true }),
    supabase.from("milestones").select("*").order("sort_order", { ascending: true }),
  ]);

  const subtasksByAction = new Map<string, Subtask[]>();
  for (const s of (subtasks ?? []) as Subtask[]) {
    const list = subtasksByAction.get(s.action_id) ?? [];
    list.push(s);
    subtasksByAction.set(s.action_id, list);
  }

  const actionsWithSubtasks = (actions ?? []).map((a) => ({
    ...a,
    subtasks: subtasksByAction.get(a.id) ?? [],
  }));

  return <ActionsView actions={actionsWithSubtasks} milestones={milestones ?? []} />;
}
