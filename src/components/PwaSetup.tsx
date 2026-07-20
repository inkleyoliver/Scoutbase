"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { captureBrainDump } from "@/lib/server/inboxMutations";
import { flushOfflineQueue, getQueueLength } from "@/lib/offlineQueue";

// §9 PWA layer: registers the Serwist-built service worker, and retries any
// captures that got queued locally (src/lib/offlineQueue.ts) whenever the
// browser comes back online or the app reloads.
export default function PwaSetup() {
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal: the app still works without the SW, just without
        // offline caching / push support.
      });
    }

    async function flush() {
      if (getQueueLength() === 0) return;
      const flushed = await flushOfflineQueue(async (text) => {
        const result = await captureBrainDump(text);
        return result.ok;
      });
      if (flushed > 0) router.refresh();
    }

    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [router]);

  return null;
}
