import { createClient } from "@/lib/supabase/server";
import InboxView from "./InboxView";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const supabase = await createClient();

  const [{ data: items }, { data: milestones }] = await Promise.all([
    supabase.from("inbox_items").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("milestones").select("*").neq("status", "complete"),
  ]);

  return <InboxView items={items ?? []} milestones={milestones ?? []} />;
}
