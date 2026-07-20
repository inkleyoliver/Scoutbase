import { Resend } from "resend";

let client: Resend | null = null;

// Lazily construct the Resend client (same pattern as lib/anthropic.ts) so
// building the app never fails on a placeholder RESEND_API_KEY.
export function getResendClient(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

// Must be an address on a domain verified in the Resend dashboard — see
// README "Resend setup". Falls back to Resend's shared sandbox sender so
// `npm run build` and local testing never hard-fail on a missing env var.
export function getDigestFrom(): string {
  return process.env.DIGEST_FROM_EMAIL || "Scoutbase <onboarding@resend.dev>";
}
