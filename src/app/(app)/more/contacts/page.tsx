import { createClient } from "@/lib/supabase/server";
import ContactsView from "./ContactsView";

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const supabase = await createClient();
  const { data: contacts } = await supabase.from("contacts").select("*").order("name", { ascending: true });
  return <ContactsView contacts={contacts ?? []} />;
}
