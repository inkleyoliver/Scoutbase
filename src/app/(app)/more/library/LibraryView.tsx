"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Modal from "@/components/Modal";
import RoleChip from "@/components/RoleChip";
import { useFocusMode } from "@/components/FocusModeContext";
import { FOCUS_MODE_TO_ROLE_KEY } from "@/lib/constants";
import { createResource, deleteResource } from "@/lib/server/referenceMutations";
import type { Resource, ResourceCategory, RoleKey } from "@/lib/types";

const CATEGORY_LABEL: Record<ResourceCategory, string> = {
  policy: "Policy",
  osm: "OSM",
  "risk-assessment": "Risk assessment",
  template: "Template",
  other: "Other",
};

export default function LibraryView({ resources }: { resources: Resource[] }) {
  const { focusMode } = useFocusMode();
  const roleFilter = FOCUS_MODE_TO_ROLE_KEY[focusMode];
  const [showNew, setShowNew] = useState(false);
  const router = useRouter();

  const filtered = roleFilter ? resources.filter((r) => r.role_key === roleFilter) : resources;

  const grouped = useMemo(() => {
    const byCategory = new Map<ResourceCategory, Resource[]>();
    for (const r of filtered) {
      const list = byCategory.get(r.category) ?? [];
      list.push(r);
      byCategory.set(r.category, list);
    }
    return Array.from(byCategory.entries());
  }, [filtered]);

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5 max-w-xl">
      <Link href="/more" className="text-sm text-[var(--foreground-muted)] hover:underline">
        ← More
      </Link>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Library</h1>
        <button onClick={() => setShowNew(true)} className="h-10 px-4 rounded-lg bg-[#4C1D95] text-white text-sm font-medium">
          + New resource
        </button>
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-[var(--foreground-muted)] py-8 text-center">No resources yet.</p>
      )}

      {grouped.map(([category, items]) => (
        <section key={category} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--foreground-muted)] uppercase tracking-wide">
            {CATEGORY_LABEL[category]}
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <RoleChip roleKey={r.role_key} />
                  </div>
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-[#4C1D95] dark:text-violet-300 hover:underline">
                      {r.title} ↗
                    </a>
                  ) : (
                    <span className="font-medium">{r.title}</span>
                  )}
                  {r.notes && <p className="text-sm text-[var(--foreground-muted)]">{r.notes}</p>}
                </div>
                <button
                  aria-label="Delete resource"
                  onClick={() => confirm(`Delete ${r.title}?`) && deleteResource(r.id).then(() => router.refresh())}
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
        <Modal title="New resource" onClose={() => setShowNew(false)}>
          <NewResourceForm defaultRole={roleFilter ?? undefined} onDone={() => setShowNew(false)} />
        </Modal>
      )}
    </div>
  );
}

function NewResourceForm({ defaultRole, onDone }: { defaultRole?: RoleKey; onDone: () => void }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [roleKey, setRoleKey] = useState<RoleKey>(defaultRole ?? "both");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<ResourceCategory>("other");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!title.trim()) {
      setError("Give it a title.");
      return;
    }
    setPending(true);
    const result = await createResource({ title, role_key: roleKey, url: url || null, category, notes: notes || null });
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
        <label className="text-sm font-medium">Title</label>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">URL</label>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm" />
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
          <label className="text-sm font-medium">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as ResourceCategory)} className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm">
            {Object.entries(CATEGORY_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm resize-none" />
      </div>
      {error && <p className="text-sm text-[var(--overdue)]">{error}</p>}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onDone} className="h-11 px-4 rounded-lg text-sm font-medium text-[var(--foreground-muted)]">Cancel</button>
        <button type="button" onClick={submit} disabled={pending} className="h-11 px-5 rounded-lg bg-[#4C1D95] text-white text-sm font-medium disabled:opacity-50">
          {pending ? "Saving…" : "Add resource"}
        </button>
      </div>
    </div>
  );
}
