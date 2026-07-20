"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function getVapidPublicKey(): Promise<string | null> {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function savePushSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  deviceLabel: string | null
) {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      device_label: deviceLabel,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/more/settings");
  return { ok: true as const };
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/more/settings");
  return { ok: true as const };
}

export async function updateUserSettings(patch: {
  digest_enabled?: boolean;
  digest_time?: string;
  focus_default?: "All" | "GSL" | "Explorers";
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { error } = await supabase
    .from("user_settings")
    .upsert({ owner_id: user.id, ...patch }, { onConflict: "owner_id" });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/more/settings");
  return { ok: true as const };
}
