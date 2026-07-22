import { createClient } from "@/lib/supabase/server";
import CalendarView from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();

  const { data: actions } = await supabase
    .from("actions")
    .select("*")
    .in("status", ["open", "waiting"])
    .not("due_date", "is", null)
    .order("due_date", { ascending: true });

  return <CalendarView actions={actions ?? []} />;
}
