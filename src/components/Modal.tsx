"use client";

export default function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/40 p-4 pt-16 md:pt-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[var(--surface)] shadow-xl p-5 flex flex-col gap-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-[var(--surface-muted)]">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
