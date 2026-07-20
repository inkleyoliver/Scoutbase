import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ActionDetailView from "./ActionDetailView";

export const dynamic = "force-dynamic";

export default async function ActionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: action }, { data: subtasks }, { data: milestones }] = await Promise.all([
    supabase.from("actions").select("*").eq("id", id).single(),
    supabase.from("subtasks").select("*").eq("action_id", id).order("sort_order", { ascending: true }),
    supabase.from("milestones").select("*").order("sort_order", { ascending: true }),
  ]);

  if (!action) notFound();

  return <ActionDetailView action={action} subtasks={subtasks ?? []} milestones={milestones ?? []} />;
}
