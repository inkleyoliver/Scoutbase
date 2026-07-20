"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

// Browser-side Supabase client for use in Client Components.
// Not generic over Database: we hand-write row types in @/lib/types and use
// them explicitly at the call site instead of threading them through the
// Supabase generic (which requires `supabase gen types` against a live
// project we don't have yet — see src/lib/database.types.ts).
export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
