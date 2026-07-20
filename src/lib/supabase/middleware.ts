import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";

const PUBLIC_PATHS = ["/login", "/auth"];

// Refreshes the Supabase auth session on every request and redirects
// unauthenticated users to /login. Also enforces the single-user allow-list
// at the edge so protected pages never render for the wrong account.
export async function updateSession(request: NextRequest) {
  // DEMO_MODE=true: no real Supabase project to talk to, and the mock
  // client is always "signed in" as the seeded owner — skip the auth
  // roundtrip entirely rather than trying to run it through a mock cookie
  // session. No effect when DEMO_MODE is unset (the real path below is
  // untouched).
  if (process.env.DEMO_MODE === "true") {
    if (request.nextUrl.pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/today";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const allowedEmail = (process.env.ALLOWED_USER_EMAIL ?? "").toLowerCase();
  const isAllowedUser = !!user && user.email?.toLowerCase() === allowedEmail;

  if (!isPublic && !isAllowedUser) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && isAllowedUser) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  return response;
}
