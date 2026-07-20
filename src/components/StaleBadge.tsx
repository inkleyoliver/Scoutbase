"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { archiveAction, markActionStillReal, snoozeActionOneMonth } from "@/lib/server/actionMutations";

// §7.3 — quiet amber "Still real?" badge with one-tap resolution options.
// Never auto-archives an open action; the user always decides (§1.6).
export default function StaleBadge({ actionId }: { actionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2.5 py-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="text-xs font-medium text-amber-800 dark:text-amber-300">Still real?</span>
      <button
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          run(() => markActionStillReal(actionId));
        }}
        className="text-xs font-medium text-amber-800 dark:text-amber-300 underline underline-offset-2"
      >
        Yes, keep
      </button>
      <button
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          run(() => snoozeActionOneMonth(actionId));
        }}
        className="text-xs font-medium text-amber-800 dark:text-amber-300 underline underline-offset-2"
      >
        Snooze a month
      </button>
      <button
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          run(() => archiveAction(actionId));
        }}
        className="text-xs font-medium text-amber-800 dark:text-amber-300 underline underline-offset-2"
      >
        Archive
      </button>
    </div>
  );
}
