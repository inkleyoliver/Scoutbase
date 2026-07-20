import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RecurringManager from "./RecurringManager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: recurrences } = await supabase
    .from("recurrences")
    .select("*")
    .order("next_due", { ascending: true });

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-xl">
      <Link href="/more" className="text-sm text-[var(--foreground-muted)] hover:underline">
        ← More
      </Link>
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="flex flex-col gap-3 border-t border-[var(--border)] pt-5">
        <RecurringManager recurrences={recurrences ?? []} />
      </section>
    </div>
  );
}
