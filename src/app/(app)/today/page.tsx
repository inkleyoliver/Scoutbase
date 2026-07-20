import { createClient } from "@/lib/supabase/server";
import TodayView from "./TodayView";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = await createClient();

  // Open+waiting actions for ranking/waiting strip, plus everything
  // completed in the last 14 days for the balance indicator (§7.1).
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const [{ data: openActions }, { data: recentlyDone }] = await Promise.all([
    supabase.from("actions").select("*").in("status", ["open", "waiting"]),
    supabase
      .from("actions")
      .select("*")
      .eq("status", "done")
      .gte("completed_at", fourteenDaysAgo.toISOString()),
  ]);

  return <TodayView openActions={openActions ?? []} recentlyDone={recentlyDone ?? []} />;
}
