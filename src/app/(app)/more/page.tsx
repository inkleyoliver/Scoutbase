import Link from "next/link";

const REFERENCE_ITEMS = [
  { href: "/more/contacts", label: "Contacts", icon: "👤", desc: "Trustees, DC, unit leaders — call/email links" },
  { href: "/more/notes", label: "Meeting notes", icon: "📝", desc: "Markdown notes, extract actions into the Inbox" },
  { href: "/more/decisions", label: "Decisions log", icon: "📋", desc: "Chronological record for structural reform" },
  { href: "/more/library", label: "Library", icon: "📚", desc: "Policies, OSM, templates, links" },
];

const SETTINGS_ITEMS = [
  { href: "/more/settings", label: "Settings", icon: "⚙", desc: "Recurring tasks, notifications, focus mode, export" },
];

export default function MorePage() {
  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-xl">
      <h1 className="text-xl font-semibold">More</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">Reference</h2>
        <MenuList items={REFERENCE_ITEMS} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
          Settings
        </h2>
        <MenuList items={SETTINGS_ITEMS} />
      </section>
    </div>
  );
}

function MenuList({ items }: { items: { href: string; label: string; icon: string; desc: string }[] }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 min-h-[64px]"
        >
          <span className="text-xl" aria-hidden>
            {item.icon}
          </span>
          <div className="flex flex-col">
            <span className="font-medium">{item.label}</span>
            <span className="text-xs text-[var(--foreground-muted)]">{item.desc}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
