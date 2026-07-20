import { createClient } from "@/lib/supabase/server";
import InboxView from "./InboxView";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const supabase = await createClient();

  const { data: items } = await supabase
    .from("inbox_items")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return <InboxView items={items ?? []} />;
}
