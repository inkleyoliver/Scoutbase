import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NoteDetailView from "./NoteDetailView";

export const dynamic = "force-dynamic";

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: note } = await supabase.from("meeting_notes").select("*").eq("id", id).single();
  if (!note) notFound();
  return <NoteDetailView note={note} />;
}
