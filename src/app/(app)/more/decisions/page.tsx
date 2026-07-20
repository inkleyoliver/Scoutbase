import { createClient } from "@/lib/supabase/server";
import DecisionsView from "./DecisionsView";

export const dynamic = "force-dynamic";

export default async function DecisionsPage() {
  const supabase = await createClient();
  const [{ data: decisions }, { data: notes }] = await Promise.all([
    supabase.from("decisions").select("*").order("decided_on", { ascending: false, nullsFirst: false }),
    supabase.from("meeting_notes").select("id, title").order("meeting_date", { ascending: false }),
  ]);
  return <DecisionsView decisions={decisions ?? []} notes={notes ?? []} />;
}
