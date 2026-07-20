import type { ActionPriority, ActionStatus } from "@/lib/types";

const STATUS_LABEL: Record<ActionStatus, string> = {
  open: "Open",
  waiting: "Waiting",
  done: "Done",
  archived: "Archived",
};

const STATUS_CLASS: Record<ActionStatus, string> = {
  open: "bg-[var(--surface-muted)] text-[var(--foreground-muted)]",
  waiting: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  done: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  archived: "bg-[var(--surface-muted)] text-[var(--foreground-muted)] opacity-70",
};

export function StatusPill({ status }: { status: ActionStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

const PRIORITY_CLASS: Record<ActionPriority, string> = {
  urgent: "text-[var(--overdue)]",
  high: "text-amber-700 dark:text-amber-400",
  normal: "text-[var(--foreground-muted)]",
  low: "text-[var(--foreground-muted)]",
};

export function PriorityLabel({ priority }: { priority: ActionPriority }) {
  if (priority === "normal") return null;
  return <span className={`text-xs font-semibold uppercase tracking-wide ${PRIORITY_CLASS[priority]}`}>{priority}</span>;
}
