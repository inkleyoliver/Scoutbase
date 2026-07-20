import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MilestoneDetailView from "./MilestoneDetailView";

export const dynamic = "force-dynamic";

export default async function MilestoneDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: milestone }, { data: actions }] = await Promise.all([
    supabase.from("milestones").select("*").eq("id", id).single(),
    supabase
      .from("actions")
      .select("*")
      .eq("milestone_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!milestone) notFound();

  return <MilestoneDetailView milestone={milestone} actions={actions ?? []} />;
}
