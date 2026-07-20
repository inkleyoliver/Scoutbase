"use client";

export default function ExportButton() {
  return (
    <a
      href="/api/export"
      className="h-10 w-fit px-4 rounded-lg border border-[var(--border)] text-sm font-medium flex items-center"
    >
      Download JSON export
    </a>
  );
}
