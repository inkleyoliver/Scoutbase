import { NextResponse } from "next/server";

/**
 * Vercel Cron injects `Authorization: Bearer $CRON_SECRET` on requests it
 * triggers when CRON_SECRET is set as a project env var. We also accept
 * `?secret=` so the job can be triggered manually/for testing (§11: cron
 * routes must verify CRON_SECRET).
 */
export function verifyCronRequest(request: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret === "change-me") {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret");

  const provided = authHeader?.replace(/^Bearer\s+/i, "") ?? querySecret;
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
