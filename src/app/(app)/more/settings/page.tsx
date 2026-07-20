import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import RecurringManager from "./RecurringManager";
import NotificationSettings from "./NotificationSettings";
import ExportButton from "./ExportButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: recurrences }, { data: subscriptions }, { data: settings }] = await Promise.all([
    supabase.from("recurrences").select("*").order("next_due", { ascending: true }),
    supabase.from("push_subscriptions").select("*").order("created_at", { ascending: true }),
    supabase.from("user_settings").select("*").maybeSingle(),
  ]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-xl">
      <Link href="/more" className="text-sm text-[var(--foreground-muted)] hover:underline">
        ← More
      </Link>
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="flex flex-col gap-3 border-t border-[var(--border)] pt-5">
        <RecurringManager recurrences={recurrences ?? []} />
      </section>

      <section className="border-t border-[var(--border)] pt-5">
        <NotificationSettings subscriptions={subscriptions ?? []} settings={settings ?? null} />
      </section>

      <section className="flex flex-col gap-2 border-t border-[var(--border)] pt-5">
        <h2 className="text-sm font-semibold">Export</h2>
        <p className="text-xs text-[var(--foreground-muted)]">
          One-click JSON export of every table — a backup safety valve.
        </p>
        <ExportButton />
      </section>
    </div>
  );
}
