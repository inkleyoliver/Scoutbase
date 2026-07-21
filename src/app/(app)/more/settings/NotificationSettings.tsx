"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getVapidPublicKey,
  removePushSubscription,
  savePushSubscription,
  updateUserSettings,
} from "@/lib/server/pushMutations";
import type { PushSubscriptionRow, UserSettings } from "@/lib/types";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationSettings({
  subscriptions,
  settings,
}: {
  subscriptions: PushSubscriptionRow[];
  settings: UserSettings | null;
}) {
  const router = useRouter();
  const [deviceLabel, setDeviceLabel] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // Lazy initializer (not an effect) so this never triggers a second render;
  // server-rendered markup assumes supported=true and the client corrects on
  // hydration if the API is genuinely missing (e.g. non-installed iOS Safari).
  const [supported] = useState(
    () => typeof navigator !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
  );

  const [focusDefault, setFocusDefault] = useState(settings?.focus_default ?? "All");

  async function enablePush() {
    setMessage(null);
    setPending(true);
    try {
      const publicKey = await getVapidPublicKey();
      if (!publicKey) {
        setMessage("Push isn't configured yet — VAPID_PUBLIC_KEY is missing on the server.");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission was not granted.");
        return;
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as ArrayBuffer,
      });
      const json = subscription.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
      if (!json.endpoint || !json.keys) throw new Error("Browser did not return a usable subscription.");
      const result = await savePushSubscription({ endpoint: json.endpoint, keys: json.keys }, deviceLabel || null);
      if (!result.ok) {
        setMessage(result.error ?? "Could not save subscription.");
        return;
      }
      setMessage("Push enabled on this device.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not enable push on this device.");
    } finally {
      setPending(false);
    }
  }

  async function saveSettings() {
    setPending(true);
    await updateUserSettings({ focus_default: focusDefault });
    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Notifications</h2>
        {!supported && (
          <p className="text-xs text-[var(--foreground-muted)]">
            This browser doesn&apos;t support push. On iOS, add Scoutbase to your Home Screen first (see README).
          </p>
        )}
        <div className="flex flex-col gap-2">
          {subscriptions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
              <span>{s.device_label || "Unnamed device"}</span>
              <button
                onClick={() => removePushSubscription(s.endpoint).then(() => router.refresh())}
                className="text-xs text-[var(--foreground-muted)] hover:text-[var(--overdue)]"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={deviceLabel}
            onChange={(e) => setDeviceLabel(e.target.value)}
            placeholder="Device label (e.g. iPhone)"
            className="h-10 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          />
          <button
            onClick={enablePush}
            disabled={pending || !supported}
            className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50"
          >
            Enable on this device
          </button>
        </div>
        {message && <p className="text-xs text-[var(--foreground-muted)]">{message}</p>}
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
        <h2 className="text-sm font-semibold">Focus mode default</h2>
        <select
          value={focusDefault}
          onChange={(e) => setFocusDefault(e.target.value as "All" | "GSL" | "Explorers")}
          className="h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm w-fit"
        >
          <option value="All">All</option>
          <option value="GSL">GSL</option>
          <option value="Explorers">Explorers</option>
        </select>
      </div>

      <div>
        <button onClick={saveSettings} disabled={pending} className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50">
          Save settings
        </button>
      </div>
    </div>
  );
}
