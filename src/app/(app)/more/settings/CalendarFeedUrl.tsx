"use client";

import { useState } from "react";

export default function CalendarFeedUrl({ url }: { url: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!url) {
    return (
      <p className="text-xs text-[var(--foreground-muted)]">
        Not configured yet — set `CALENDAR_FEED_SECRET` and `NEXT_PUBLIC_APP_URL` to enable this.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--foreground-muted)]">
        Add this URL as a subscription in Apple/Google Calendar to see action due dates alongside your other
        calendars. Treat it like a password — anyone with the link can read your due dates.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          onFocus={(e) => e.target.select()}
          className="h-10 flex-1 min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs"
        />
        <button
          onClick={() => {
            navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="h-10 px-3 rounded-lg border border-[var(--border)] text-xs font-medium shrink-0"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}
