"use client";

import InlineCaptureBox from "@/components/InlineCaptureBox";
import InboxItemGroup from "@/components/InboxItemGroup";
import { useFocusMode } from "@/components/FocusModeContext";
import { FOCUS_MODE_TO_ROLE_KEY } from "@/lib/constants";
import type { InboxItem } from "@/lib/types";

export default function InboxView({ items }: { items: InboxItem[] }) {
  const { focusMode } = useFocusMode();
  const roleFilter = FOCUS_MODE_TO_ROLE_KEY[focusMode];

  // An inbox item can propose actions across multiple roles at once, so
  // focus mode hides individual proposal cards rather than whole captures.
  // Indices into ai_proposal.items must stay untouched here (they're the
  // identity ProposalCard uses to accept/discard) — filtering happens
  // inside InboxItemGroup instead.
  const visibleItems = items.filter((item) => {
    if (!roleFilter || !item.ai_proposal) return true;
    const hasMatchingItem = item.ai_proposal.items.some((i) => i.role_key === roleFilter);
    return hasMatchingItem || item.ai_proposal.items.length === 0;
  });

  return (
    <div className="p-4 md:p-6 flex flex-col gap-4 max-w-2xl">
      <h1 className="text-xl font-semibold">Inbox</h1>
      <InlineCaptureBox />

      {visibleItems.length === 0 ? (
        <p className="text-sm text-[var(--foreground-muted)] py-10 text-center">
          Inbox zero. Nothing needs filing.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleItems.map((item) => (
            <InboxItemGroup key={item.id} item={item} roleFilter={roleFilter} />
          ))}
        </div>
      )}
    </div>
  );
}
