import { fmtDate, cn } from "@/lib/utils";
import { what } from "@/lib/leave";
import type { Absence } from "@/lib/data";

const TONE: Record<string, string> = {
  annual: "bg-secondary text-primary",
  sick: "bg-red-100 text-red-800",
  other: "bg-amber-100 text-amber-800",
  wfh: "bg-indigo-100 text-indigo-800",
};
const LEGEND = [["annual", "Annual"], ["sick", "Sick"], ["other", "Other leave"], ["wfh", "WFH"]] as const;
const tone = (a: Absence) => TONE[a.kind === "wfh" ? "wfh" : a.leave_type ?? "other"];

/** One row per person away this week; consecutive days of the same absence merge into one bar. Pending = dashed. */
export function TeamCalendar({ absences, days, today }: { absences: Absence[]; days: string[]; today: string }) {
  const byPerson = new Map<string, Absence[]>();
  for (const a of absences) byPerson.set(a.employee_id, [...(byPerson.get(a.employee_id) ?? []), a]);
  const rows = [...byPerson.values()]
    .map((list) => {
      // Leave beats WFH, approved beats pending, when two overlap on a day.
      const rank = (a: Absence) => (a.kind === "leave" ? 0 : 2) + (a.status === "approved" ? 0 : 1);
      const cells = days.map((d) => list.filter((a) => a.start_date <= d && a.end_date >= d).sort((x, y) => rank(x) - rank(y))[0] ?? null);
      const segs: { a: Absence | null; span: number }[] = [];
      for (const a of cells) {
        const last = segs.at(-1);
        if (a && last?.a === a) last.span++;
        else segs.push({ a, span: 1 });
      }
      return { id: list[0].employee_id, name: list[0].employee.full_name, segs };
    })
    .sort((x, y) => x.name.localeCompare(y.name));

  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">No one is away this week.</p>;
  const grid = "grid grid-cols-[11rem_repeat(5,minmax(0,1fr))] items-center gap-2";
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-wrap gap-3.5 text-[13px] text-foreground/80" aria-label="Legend">
        {LEGEND.map(([k, label]) => (
          <li key={k} className="flex items-center gap-1.5"><span className={cn("size-3 rounded-[3px] border border-current", TONE[k])} aria-hidden />{label}</li>
        ))}
        <li className="flex items-center gap-1.5"><span className="size-3 rounded-[3px] border border-dashed border-foreground/60" aria-hidden />Pending</li>
      </ul>
      <div className="max-h-[32rem] overflow-auto">
        <div className="flex min-w-[760px] flex-col gap-2">
          <div className={cn(grid, "sticky top-0 z-[1] bg-card pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase")}>
            <span>Employee</span>
            {days.map((d) => <span key={d} className={cn(d === today && "text-primary")}>{fmtDate(d, { weekday: "short", day: "numeric" })}</span>)}
          </div>
          {rows.map((r) => (
            <div key={r.id} className={grid}>
              <span className="truncate text-sm font-medium">{r.name}</span>
              {r.segs.map(({ a, span }, i) =>
                a ? (
                  <span
                    key={i}
                    style={{ gridColumn: `span ${span}` }}
                    className={cn("flex h-9 items-center truncate rounded-lg px-3 text-[13px] font-semibold", tone(a), a.status === "pending" && "border border-dashed border-current")}
                  >
                    {what(a)}{a.status === "pending" && " · pending"}
                  </span>
                ) : (
                  <span key={i} style={{ gridColumn: `span ${span}` }} className="h-9 rounded-lg bg-muted/60" aria-hidden />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
