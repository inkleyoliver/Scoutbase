import { ROLE_META } from "@/lib/constants";
import type { RoleKey } from "@/lib/types";

export default function RoleChip({ roleKey, className = "" }: { roleKey: RoleKey; className?: string }) {
  const meta = ROLE_META[roleKey];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{ backgroundColor: meta.colorSoft, color: meta.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.color }} />
      {meta.label}
    </span>
  );
}
