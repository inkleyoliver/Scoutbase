"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { captureBrainDump } from "@/lib/server/inboxMutations";
import { queueCapture } from "@/lib/offlineQueue";

// §1.1 / §5.1 — capture is reachable from every screen via FAB (mobile) or
// a ⌘K bar (desktop). One tap -> textarea -> submit. No required fields
// beyond the text itself.
export default function CaptureBar() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [justCaptured, setJustCaptured] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const router = useRouter();

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  useEffect(() => {
    // Resets transient UI state when the modal opens (not derived React state).
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setJustCaptured(false);
      setTimeout(() => textareaRef.current?.focus(), 10);
    }
  }, [open]);

  function submit() {
    const value = text.trim();
    if (!value) return;
    startTransition(async () => {
      // §9: capture must survive a dropped connection — queue it locally
      // rather than lose it if the network call fails.
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        queueCapture(value);
      } else {
        try {
          await captureBrainDump(value);
        } catch {
          queueCapture(value);
        }
      }
      setText("");
      setJustCaptured(true);
      router.refresh();
      setTimeout(() => {
        setOpen(false);
        router.push("/inbox");
      }, 700);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Capture a thought"
        className="fixed bottom-20 right-5 md:bottom-8 md:right-8 z-40 h-14 w-14 rounded-full bg-[#4C1D95] text-white text-2xl leading-none shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        +
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/40 p-4 pt-20 md:pt-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[var(--surface)] shadow-xl p-4 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-[var(--foreground-muted)]">
              Brain dump. Type anything — the AI will sort it out.
            </p>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
              }}
              rows={4}
              placeholder="e.g. Chase Dave about the hall lease, need to book First Response before Feb…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-3 text-base outline-none focus:ring-2 focus:ring-[#4C1D95] resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !text.trim()}
                className="h-11 px-5 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50"
              >
                {pending ? "Saving…" : justCaptured ? "Captured ✓" : "Capture (⌘⏎)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
