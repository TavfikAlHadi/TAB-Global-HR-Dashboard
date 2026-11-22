"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { UserPlus, Briefcase, CalendarCheck, FilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OFFICES, BRANDS, ROLES, type Role } from "@/lib/constants";
import { setRole } from "@/app/actions";

const selectCls = "h-9 rounded-lg border bg-card px-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

export function Filters() {
  const router = useRouter();
  const path = usePathname();
  const sp = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(next.size ? `${path}?${next}` : path);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Office" className={selectCls} value={sp.get("office") ?? ""} onChange={(e) => set("office", e.target.value)}>
        <option value="">All offices</option>
        {OFFICES.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <select aria-label="Brand" className={selectCls} value={sp.get("brand") ?? ""} onChange={(e) => set("brand", e.target.value)}>
        <option value="">All brands</option>
        {BRANDS.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
    </div>
  );
}

export function RoleSwitcher({ role }: { role: Role }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      View as
      <select
        className={selectCls}
        value={role}
        disabled={pending}
        onChange={(e) => start(async () => { await setRole(e.target.value); router.refresh(); })}
      >
        {ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
    </label>
  );
}

const ACTIONS = [
  { label: "Add Employee", icon: UserPlus, phase: 4 },
  { label: "Post Job", icon: Briefcase, phase: 6 },
  { label: "Approve Leave", icon: CalendarCheck, phase: 4 },
  { label: "New SOP", icon: FilePlus, phase: 5 },
];

export function QuickActions({ canEditSops }: { canEditSops: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACTIONS.filter((a) => a.label !== "New SOP" || canEditSops).map((a, i) => (
        <Button key={a.label} variant={i === 0 ? "default" : "outline"} size="lg" className="px-3.5" onClick={() => toast(`${a.label} arrives in Phase ${a.phase}.`)}>
          <a.icon aria-hidden /> {a.label}
        </Button>
      ))}
    </div>
  );
}
