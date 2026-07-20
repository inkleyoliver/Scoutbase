import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";

// Service-role client for routes with no authenticated request context: cron
// jobs and the inbound-email webhook (§9, §5.2, §11). Bypasses RLS entirely,
// so every caller MUST verify CRON_SECRET / INBOUND_EMAIL_SECRET first and
// MUST scope queries to the single owner via getOwnerId() below — there is
// no auth.uid() to fall back on here.
export function createAdminClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Single-user app (§2, §11): the one allow-listed user is the owner of every
 * row. Cron/webhook routes look this id up once via the Admin API rather
 * than hard-coding it, so it keeps working if the project is ever reseeded.
 */
export async function getOwnerId(admin: ReturnType<typeof createAdminClient>): Promise<string | null> {
  const email = process.env.ALLOWED_USER_EMAIL;
  if (!email) return null;
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) return null;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  return user?.id ?? null;
}
