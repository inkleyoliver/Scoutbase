import { createClient } from "@/lib/supabase/server";
import LibraryView from "./LibraryView";

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: resources } = await supabase.from("resources").select("*").order("category", { ascending: true });
  return <LibraryView resources={resources ?? []} />;
}
