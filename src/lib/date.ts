// Small date helpers. Dates in the DB are plain `date` (YYYY-MM-DD) columns
// with no timezone — we treat "today" as the local calendar date, which is
// good enough for a single-user, Europe/London app.

export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(isoOrDate: string | Date, days: number): Date {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate + "T00:00:00") : new Date(isoOrDate);
  d.setDate(d.getDate() + days);
  return d;
}

/** Whole-day difference: target - reference (positive = target is in the future). */
export function daysDiff(targetISO: string, referenceISO: string = todayISO()): number {
  const target = new Date(targetISO + "T00:00:00");
  const reference = new Date(referenceISO + "T00:00:00");
  const ms = target.getTime() - reference.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** Large, time-blindness-friendly relative label for a due date. */
export function formatRelativeDue(dueDateISO: string | null, referenceISO: string = todayISO()): string | null {
  if (!dueDateISO) return null;
  const diff = daysDiff(dueDateISO, referenceISO);
  if (diff < 0) return `Overdue by ${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"}`;
  if (diff === 0) return "Due TODAY";
  if (diff === 1) return "Due tomorrow";
  return `Due in ${diff} days`;
}

export function formatShortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysSince(iso: string | null, referenceISO: string = todayISO()): number | null {
  if (!iso) return null;
  return -daysDiff(iso, referenceISO);
}
