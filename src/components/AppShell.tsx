"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FocusModeProvider } from "./FocusModeContext";
import FocusModeToggle from "./FocusModeToggle";
import CaptureBar from "./CaptureBar";
import { signOut } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/today", label: "Today", icon: "☀" },
  { href: "/inbox", label: "Inbox", icon: "📥" },
  { href: "/actions", label: "Actions", icon: "✓" },
  { href: "/plan", label: "Plan", icon: "🗺" },
  { href: "/more", label: "More", icon: "⋯" },
];

export default function AppShell({
  userEmail,
  children,
}: {
  userEmail: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <FocusModeProvider>
      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex md:w-56 md:flex-col md:border-r md:border-[var(--border)] md:bg-[var(--surface)] md:px-4 md:py-6 md:gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold px-2">Scoutbase</span>
            <span className="text-xs text-[var(--foreground-muted)] px-2 truncate">{userEmail}</span>
          </div>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium " +
                    (active
                      ? "bg-[var(--surface-muted)] text-[var(--foreground)]"
                      : "text-[var(--foreground-muted)] hover:bg-[var(--surface-muted)]")
                  }
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <FocusModeToggle />
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-[var(--foreground-muted)] hover:text-[var(--foreground)] px-2"
              >
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <div className="flex flex-1 min-w-0 flex-col">
          {/* Top bar: mobile focus toggle + always-visible on desktop too via header for narrow desktop windows */}
          <header className="flex md:hidden items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3">
            <span className="text-base font-semibold">Scoutbase</span>
            <FocusModeToggle />
          </header>

          <main className="flex-1 min-w-0 pb-24 md:pb-8">{children}</main>

          {/* Mobile bottom tab bar */}
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex border-t border-[var(--border)] bg-[var(--surface)]">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium " +
                    (active ? "text-[#4C1D95]" : "text-[var(--foreground-muted)]")
                  }
                >
                  <span aria-hidden className="text-base">
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <CaptureBar />
      </div>
    </FocusModeProvider>
  );
}
