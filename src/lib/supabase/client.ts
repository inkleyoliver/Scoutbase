"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import { createMockSupabaseClient } from "@/lib/demo/mockSupabaseClient";

// Browser-side Supabase client for use in Client Components.
// Not generic over Database: we hand-write row types in @/lib/types and use
// them explicitly at the call site instead of threading them through the
// Supabase generic (which requires `supabase gen types` against a live
// project we don't have yet — see src/lib/database.types.ts).
//
// Unused by any current call site (all data access happens server-side) but
// gated the same way as server.ts/admin.ts for consistency: DEMO_MODE is not
// itself readable in the browser bundle, so this checks the NEXT_PUBLIC_
// mirror instead. No effect on the real path either way.
export function createClient() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return createMockSupabaseClient() as unknown as ReturnType<typeof createBrowserClient>;
  }
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}
