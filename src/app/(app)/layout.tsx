import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-braces: middleware already enforces the allow-list, but every
  // authenticated route re-checks so a page never renders without a user.
  if (!user) redirect("/login");

  return <AppShell userEmail={user.email ?? null}>{children}</AppShell>;
}
