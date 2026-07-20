import { createClient } from "@/lib/supabase/server";
import NotesView from "./NotesView";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: notes } = await supabase
    .from("meeting_notes")
    .select("*")
    .order("meeting_date", { ascending: false, nullsFirst: false });
  return <NotesView notes={notes ?? []} />;
}
