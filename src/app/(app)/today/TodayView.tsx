"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useFocusMode } from "@/components/FocusModeContext";
import { FOCUS_MODE_TO_ROLE_KEY } from "@/lib/constants";
import { rankTodayActions } from "@/lib/ranking";
import TodayCard from "@/components/TodayCard";
import BalanceIndicator from "@/components/BalanceIndicator";
import WaitingOnStrip from "@/components/WaitingOnStrip";
import type { Action } from "@/lib/types";

export default function TodayView({
  openActions,
  recentlyDone,
}: {
  openActions: Action[];
  recentlyDone: Action[];
}) {
  const { focusMode } = useFocusMode();
  const roleFilter = FOCUS_MODE_TO_ROLE_KEY[focusMode];

  const scopedOpen = useMemo(
    () => (roleFilter ? openActions.filter((a) => a.role_key === roleFilter) : openActions),
    [openActions, roleFilter]
  );

  const { top, remaining } = useMemo(() => rankTodayActions(scopedOpen), [scopedOpen]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl">
      <h1 className="text-xl font-semibold">Today</h1>

      {focusMode === "All" && (
        <BalanceIndicator openActions={openActions} recentlyDone={recentlyDone} />
      )}

      <WaitingOnStrip actions={scopedOpen} />

      <div className="flex flex-col gap-3">
        {top.length === 0 ? (
          <p className="text-sm text-[var(--foreground-muted)] py-8 text-center">
            Nothing urgent right now. Nice.
          </p>
        ) : (
          top.map((a) => <TodayCard key={a.id} action={a} />)
        )}
      </div>

      {remaining.length > 0 && (
        <Link href="/actions" className="text-sm text-[var(--foreground-muted)] hover:underline">
          + {remaining.length} more when you&apos;re ready
        </Link>
      )}
    </div>
  );
}
