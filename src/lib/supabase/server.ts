import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import { createMockSupabaseClient } from "@/lib/demo/mockSupabaseClient";

// Server-side Supabase client for use in Server Components, Server Actions,
// and Route Handlers. Reads/writes the auth cookie via Next's cookies() API.
// Not generic over Database — see client.ts for why.
//
// DEMO_MODE=true (see .env.local / README) swaps this for an in-memory mock
// client so the app can be browsed with realistic data and no real Supabase
// project. This is the ONLY behavior change gated by DEMO_MODE here — when
// unset, everything below is untouched.
export async function createClient() {
  if (process.env.DEMO_MODE === "true") {
    return createMockSupabaseClient() as unknown as Awaited<ReturnType<typeof createRealClient>>;
  }
  return createRealClient();
}

async function createRealClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies() is read-only.
          // Safe to ignore because middleware refreshes the session.
        }
      },
    },
  });
}
