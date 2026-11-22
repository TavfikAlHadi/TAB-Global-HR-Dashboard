import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { fmtDate } from "@/lib/utils";
import type { Absence } from "@/lib/data";

/** Leave overlapping Mon–Fri, shown as the weekdays it covers ("Wed–Fri"). */
export function OutThisWeekPanel({ absences, days, limit = 5 }: { absences: Absence[]; days: string[]; limit?: number }) {
  const leave = absences.filter((a) => a.kind === "leave");
  const wd = (iso: string) => fmtDate(iso, { weekday: "short" });
  const span = (a: Absence) => {
    const from = a.start_date < days[0] ? days[0] : a.start_date;
    const to = a.end_date > days[4] ? days[4] : a.end_date;
    return from === to ? wd(from) : `${wd(from)}–${wd(to)}`;
  };
  return (
    <div className="flex flex-col gap-3.5">
      {leave.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No one is on leave this week.</p>}
      <ul className="flex flex-col gap-3.5">
        {leave.slice(0, limit).map((a) => (
          <li key={a.id} className="flex items-center gap-2.5 text-sm">
            <Avatar name={a.employee.full_name} className="size-8 text-xs" />
            <span className="min-w-0 flex-1 truncate font-medium">{a.employee.full_name}</span>
            <span className="text-[13px] text-muted-foreground">{span(a)}</span>
          </li>
        ))}
      </ul>
      {leave.length > limit && <p className="text-[13px] text-muted-foreground">+{leave.length - limit} more</p>}
      <Link href="/whos-out" className="text-sm font-medium text-primary hover:underline">Open team calendar →</Link>
    </div>
  );
}
