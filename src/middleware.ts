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
     * - api routes that verify their own secrets (cron/webhooks)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons|api/inbound-email|api/cron).*)",
  ],
};
