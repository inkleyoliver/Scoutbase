// Central place that reads Supabase env vars. Values are read lazily (inside
// functions, not at module top-level side effects beyond simple reads) so
// that `next build` never fails just because real credentials aren't set
// yet — see .env.local placeholders.

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

export function getSupabaseServiceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
}

export function getAllowedUserEmail(): string {
  return process.env.ALLOWED_USER_EMAIL ?? "";
}
