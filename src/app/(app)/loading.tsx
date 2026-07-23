// Shared loading skeleton for every authenticated section. Because all
// pages live under the (app) layout, this single Suspense fallback shows
// instantly on navigation into any of them — the nav shell (sidebar/tab
// bar) stays put while only the content area shows placeholders, so
// switching sections feels immediate instead of frozen while the server
// round-trip completes. Most sections are card lists, so a title +
// card-row skeleton reads correctly nearly everywhere.
export default function Loading() {
  return (
    <div
      className="p-4 md:p-6 flex flex-col gap-6 max-w-2xl animate-pulse"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="h-7 w-32 rounded-lg bg-[var(--surface-muted)]" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[72px]"
          >
            <div className="h-4 w-3/4 rounded bg-[var(--surface-muted)]" />
            <div className="h-3 w-1/3 rounded bg-[var(--surface-muted)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
