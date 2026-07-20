"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { captureBrainDump } from "@/lib/server/inboxMutations";

// §7.2 — capture box pinned at the top of the Inbox screen (same underlying
// flow as the global FAB/⌘K bar).
export default function InlineCaptureBox() {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    const value = text.trim();
    if (!value) return;
    startTransition(async () => {
      await captureBrainDump(value);
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
        }}
        rows={2}
        placeholder="Brain dump anything…"
        className="w-full resize-none bg-transparent text-base outline-none placeholder:text-[var(--foreground-muted)]"
      />
      <div className="flex justify-end">
        <button
          onClick={submit}
          disabled={pending || !text.trim()}
          className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Triaging…" : "Capture"}
        </button>
      </div>
    </div>
  );
}
