import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      `mailto:${process.env.ALLOWED_USER_EMAIL || "owner@example.com"}`,
      publicKey,
      privateKey
    );
  }
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

/**
 * Sends a web-push notification to every stored subscription for the owner.
 * Deep-links to `payload.url` (§8.2). Removes subscriptions the browser has
 * revoked (404/410) so they stop being retried forever.
 */
export async function sendPushToOwner(
  supabase: SupabaseClient,
  ownerId: string,
  payload: PushPayload
): Promise<{ sent: number }> {
  ensureConfigured();
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { sent: 0 };
  }

  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("owner_id", ownerId);
  let sent = 0;

  for (const sub of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return { sent };
}
