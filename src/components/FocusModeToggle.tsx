"use client";

import { useFocusMode } from "./FocusModeContext";
import type { FocusMode } from "@/lib/types";

const OPTIONS: FocusMode[] = ["All", "GSL", "Explorers", "Personal"];

export default function FocusModeToggle() {
  const { focusMode, setFocusMode } = useFocusMode();

  return (
    <div
      role="tablist"
      aria-label="Focus mode"
      className="inline-flex rounded-full border border-[var(--border)] bg-[var(--surface-muted)] p-1 text-sm"
    >
      {OPTIONS.map((opt) => {
        const active = opt === focusMode;
        return (
          <button
            key={opt}
            role="tab"
            aria-selected={active}
            onClick={() => setFocusMode(opt)}
            className={
              "px-3 py-1.5 rounded-full font-medium transition-colors " +
              (active
                ? "bg-[var(--surface)] shadow-sm text-[var(--foreground)]"
                : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]")
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
