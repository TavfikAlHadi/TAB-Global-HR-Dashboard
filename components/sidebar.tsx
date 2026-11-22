"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { LayoutDashboard, Users, CalendarOff, Briefcase, BookOpen, CalendarDays, Megaphone, Settings } from "lucide-react";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONS = { LayoutDashboard, Users, CalendarOff, Briefcase, BookOpen, CalendarDays, Megaphone, Settings };
// Phone tab bar: the four most-used modules; the rest stay desktop-only until a "More" sheet exists.
const TABS = ["/", "/employees", "/whos-out", "/sops"];

function useNav() {
  const path = usePathname();
  const qs = useSearchParams().toString();
  return NAV.map((n) => ({
    ...n,
    Icon: ICONS[n.icon],
    to: qs ? `${n.href}?${qs}` : n.href,
    active: n.href === "/" ? path === "/" : path.startsWith(n.href),
  }));
}
type Item = ReturnType<typeof useNav>[number];

function SideLink({ n }: { n: Item }) {
  return (
    <Link
      href={n.to}
      aria-current={n.active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        n.active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
      )}
    >
      <n.Icon className="size-5" aria-hidden />
      {n.label}
    </Link>
  );
}

export function Sidebar() {
  const items = useNav();
  const settings = items.find((n) => n.href === "/settings")!;
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto gap-7 border-r bg-sidebar px-4 py-6 md:flex">
        <div className="px-2">
          <Image src="/logo.svg" alt="TAB Global" width={132} height={44} priority />
        </div>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {items.filter((n) => n !== settings).map((n) => <SideLink key={n.href} n={n} />)}
        </nav>
        <div className="mt-auto flex flex-col gap-0.5">
          <SideLink n={settings} />
          <p className="mt-2 border-t px-3 pt-3 text-xs text-muted-foreground">Phase 1 prototype · demo data</p>
        </div>
      </aside>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t bg-card px-2 pt-1.5 pb-5 md:hidden">
        {items.filter((n) => TABS.includes(n.href)).map((n) => (
          <Link
            key={n.href}
            href={n.to}
            aria-current={n.active ? "page" : undefined}
            className={cn("flex min-h-13 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted-foreground", n.active && "font-semibold text-primary")}
          >
            <n.Icon className="size-5.5" aria-hidden />
            {"short" in n ? n.short : n.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
