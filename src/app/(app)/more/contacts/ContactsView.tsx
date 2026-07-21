"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import RoleChip from "@/components/RoleChip";
import { useFocusMode } from "@/components/FocusModeContext";
import { FOCUS_MODE_TO_ROLE_KEY } from "@/lib/constants";
import { createContact, deleteContact } from "@/lib/server/referenceMutations";
import type { Contact, RoleKey } from "@/lib/types";

export default function ContactsView({ contacts }: { contacts: Contact[] }) {
  const { focusMode } = useFocusMode();
  const roleFilter = FOCUS_MODE_TO_ROLE_KEY[focusMode];
  const [showNew, setShowNew] = useState(false);
  const router = useRouter();

  const filtered = roleFilter ? contacts.filter((c) => c.role_key === roleFilter) : contacts;

  const grouped = useMemo(() => {
    const byRole = new Map<RoleKey, Contact[]>();
    for (const c of filtered) {
      const list = byRole.get(c.role_key) ?? [];
      list.push(c);
      byRole.set(c.role_key, list);
    }
    return Array.from(byRole.entries());
  }, [filtered]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 max-w-xl">
      <Link href="/more" className="text-sm text-[var(--foreground-muted)] hover:underline">
        ← More
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Contacts</h1>
        <button onClick={() => setShowNew(true)} className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium">
          + New contact
        </button>
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-[var(--foreground-muted)] py-8 text-center">No contacts yet.</p>
      )}

      {grouped.map(([roleKey, items]) => (
        <section key={roleKey} className="flex flex-col gap-2">
          <RoleChip roleKey={roleKey} />
          <div className="flex flex-col gap-2">
            {items.map((c) => (
              <div key={c.id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="font-medium">{c.name}</span>
                  {c.role_title && <span className="text-xs text-[var(--foreground-muted)]">{c.role_title}</span>}
                  <div className="flex flex-wrap gap-3 text-sm mt-1">
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="text-[#4C1D95] dark:text-violet-300 hover:underline">
                        📞 {c.phone}
                      </a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} className="text-[#4C1D95] dark:text-violet-300 hover:underline">
                        ✉ {c.email}
                      </a>
                    )}
                  </div>
                  {c.notes && <p className="text-sm text-[var(--foreground-muted)] mt-1">{c.notes}</p>}
                </div>
                <button
                  aria-label="Delete contact"
                  onClick={() =>
                    confirm(`Delete ${c.name}?`) &&
                    deleteContact(c.id).then(() => router.refresh())
                  }
                  className="text-xs text-[var(--foreground-muted)] hover:text-[var(--overdue)]"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {showNew && (
        <Modal title="New contact" onClose={() => setShowNew(false)}>
          <NewContactForm defaultRole={roleFilter ?? undefined} onDone={() => setShowNew(false)} />
        </Modal>
      )}
    </div>
  );
}

function NewContactForm({ defaultRole, onDone }: { defaultRole?: RoleKey; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>(defaultRole ?? "gsl");
  const [roleTitle, setRoleTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim()) {
      setError("Give them a name.");
      return;
    }
    setPending(true);
    const result = await createContact({ name, role_key: roleKey, role_title: roleTitle || null, email: email || null, phone: phone || null });
    setPending(false);
    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Name</label>
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Role</label>
          <select value={roleKey} onChange={(e) => setRoleKey(e.target.value as RoleKey)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
            <option value="gsl">GSL</option>
            <option value="explorers">Explorers</option>
            <option value="both">Personal</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Role title</label>
          <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} placeholder="e.g. DC" className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
        </div>
      </div>
      {error && <p className="text-sm text-[var(--overdue)]">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="h-11 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]">Cancel</button>
        <button type="button" onClick={submit} disabled={pending} className="h-11 px-5 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50">
          {pending ? "Saving…" : "Add contact"}
        </button>
      </div>
    </div>
  );
}
