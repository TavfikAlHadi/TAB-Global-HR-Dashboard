import { Home, Plane } from "lucide-react";
import { OFFICE_NAME } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";
import type { Absence } from "@/lib/data";

/** Today's list plus a per-day count for the rest of the week. */
export function WhosOutPanel({ absences, days, today }: { absences: Absence[]; days: string[]; today: string }) {
  const on = (day: string) => absences.filter((a) => a.start_date <= day && a.end_date >= day);
  const todays = on(today);
  // Someone on leave who also logged WFH counts as leave.
  const leaveIds = new Set(todays.filter((a) => a.kind === "leave").map((a) => a.employee_id));
  const list = todays.filter((a) => a.kind === "leave" || !leaveIds.has(a.employee_id));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-5 gap-1.5">
        {days.map((d) => {
          const rows = on(d);
          const leave = new Set(rows.filter((a) => a.kind === "leave").map((a) => a.employee_id)).size;
          const wfh = rows.filter((a) => a.kind === "wfh").length;
          return (
            <div key={d} className={`rounded-lg border p-2 text-center ${d === today ? "border-primary bg-secondary" : ""}`}>
              <p className="text-[11px] text-muted-foreground uppercase">{fmtDate(d, { weekday: "short" })}</p>
              <p className="text-xs text-foreground"><span className="font-semibold tabular-nums">{leave}</span> leave</p>
              <p className="text-xs text-foreground"><span className="font-semibold tabular-nums">{wfh}</span> WFH</p>
            </div>
          );
        })}
      </div>
      <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
        {list.map((a) => (
          <li key={a.id} className="flex items-center gap-3 px-3 py-2">
            {a.kind === "leave" ? <Plane className="size-4 text-destructive" aria-hidden /> : <Home className="size-4 text-teal" aria-hidden />}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{a.employee.full_name}</p>
              <p className="text-xs text-muted-foreground">{a.employee.title} · {OFFICE_NAME[a.employee.office_id]}</p>
            </div>
            <span className="text-right text-xs text-muted-foreground">
              {a.kind === "leave" ? `${a.leave_type?.replace(/^\w/, (c) => c.toUpperCase())} leave` : "WFH"}
              {a.end_date !== a.start_date && <><br />until {fmtDate(a.end_date, { day: "numeric", month: "short" })}</>}
            </span>
          </li>
        ))}
        {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Everyone is in today.</li>}
      </ul>
    </div>
  );
}
