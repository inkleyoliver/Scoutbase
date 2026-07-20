/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// §9 PWA requirements: app shell + last-fetched Today view cached for
// offline read. defaultCache already covers Next's static assets/pages
// (NetworkFirst for pages, so a fresh Today view is cached on every visit
// and served from cache if the network is unavailable). Writes still
// require connectivity — see src/lib/offlineQueue.ts for the capture retry
// queue instead of trying to sync writes in the SW.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// §8.2 push notifications: show the notification and deep-link on click.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload: { title?: string; body?: string; url?: string };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Scoutbase", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? "Scoutbase", {
      body: payload.body ?? "",
      data: { url: payload.url || "/today" },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || "/today";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
