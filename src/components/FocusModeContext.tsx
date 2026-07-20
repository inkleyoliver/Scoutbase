"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { FOCUS_MODE_STORAGE_KEY } from "@/lib/constants";
import type { FocusMode } from "@/lib/types";

interface FocusModeContextValue {
  focusMode: FocusMode;
  setFocusMode: (mode: FocusMode) => void;
}

const FocusModeContext = createContext<FocusModeContextValue>({
  focusMode: "All",
  setFocusMode: () => {},
});

// §3 Focus mode — persistent role filter toggle (All | GSL | Explorers),
// persisted in localStorage, default "All". Read once on mount to avoid
// hydration mismatches (SSR always renders "All").
export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const [focusMode, setFocusModeState] = useState<FocusMode>("All");

  useEffect(() => {
    // One-time hydration of a client-only value (localStorage); SSR always renders "All".
    const stored = window.localStorage.getItem(FOCUS_MODE_STORAGE_KEY);
    if (stored === "All" || stored === "GSL" || stored === "Explorers") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFocusModeState(stored);
    }
  }, []);

  function setFocusMode(mode: FocusMode) {
    setFocusModeState(mode);
    window.localStorage.setItem(FOCUS_MODE_STORAGE_KEY, mode);
  }

  return (
    <FocusModeContext.Provider value={{ focusMode, setFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  return useContext(FocusModeContext);
}
