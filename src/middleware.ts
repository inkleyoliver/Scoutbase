import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (static/optimisation assets)
     * - favicon.ico, manifest, icons
     * - api/cron routes that verify their own secret (CRON_SECRET)
     * - api/calendar.ics, which calendar apps poll with no session cookie
     *   and instead verifies its own token (CALENDAR_FEED_SECRET)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|api/cron|api/calendar\\.ics).*)",
  ],
};
