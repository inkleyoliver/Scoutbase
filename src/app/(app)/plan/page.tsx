import { createClient } from "@/lib/supabase/server";
import PlanView from "./PlanView";
import type { Action } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const supabase = await createClient();

  const [{ data: milestones }, { data: actions }] = await Promise.all([
    supabase.from("milestones").select("*").order("sort_order", { ascending: true }),
    supabase.from("actions").select("id, milestone_id, status").not("milestone_id", "is", null),
  ]);

  const progressByMilestone = new Map<string, { done: number; total: number }>();
  for (const a of (actions ?? []) as Pick<Action, "id" | "milestone_id" | "status">[]) {
    if (!a.milestone_id) continue;
    const entry = progressByMilestone.get(a.milestone_id) ?? { done: 0, total: 0 };
    entry.total += 1;
    if (a.status === "done") entry.done += 1;
    progressByMilestone.set(a.milestone_id, entry);
  }

  return (
    <PlanView
      milestones={milestones ?? []}
      progress={Object.fromEntries(progressByMilestone)}
    />
  );
}
