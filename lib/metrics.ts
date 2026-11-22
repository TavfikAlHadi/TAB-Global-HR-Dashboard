// Pure date/KPI rules used by lib/data.ts. No DB access, so lib/metrics.test.ts can run them directly.
import type { Status } from "./constants";

export const shift = (iso: string, days: number) => new Date(Date.parse(iso) + days * 864e5).toISOString().slice(0, 10);

/** Employed on `day`: hired on or before it, and not yet exited (exit date is the first day gone). */
export const activeOn = (e: { hire_date: string; exit_date: string | null }, day: string) =>
  e.hire_date <= day && (!e.exit_date || e.exit_date > day);

/** People out on `day`. Someone on leave who also logged WFH counts once, as leave. */
export function outCounts(rows: { kind: "leave" | "wfh"; start_date: string; end_date: string; employee_id: string }[], day: string) {
  const on = rows.filter((a) => a.start_date <= day && a.end_date >= day);
  const leave = new Set(on.filter((a) => a.kind === "leave").map((a) => a.employee_id));
  const wfh = new Set(on.filter((a) => a.kind === "wfh" && !leave.has(a.employee_id)).map((a) => a.employee_id));
  return { leave: leave.size, wfh: wfh.size };
}

/** Leavers in the last 365 days over the average of headcount now and a year ago, as a % to one decimal. */
export function attrition(people: { hire_date: string; exit_date: string | null }[], today: string) {
  const yearAgo = shift(today, -365);
  const leavers = people.filter((e) => e.exit_date && e.exit_date > yearAgo && e.exit_date <= today).length;
  const avg = (people.filter((e) => activeOn(e, today)).length + people.filter((e) => activeOn(e, yearAgo)).length) / 2;
  return { leavers, pct: avg ? Math.round((leavers / avg) * 1000) / 10 : 0 };
}

/** Directory status for a current or incoming employee. Probation = first 90 days. */
export function directoryStatus(e: { hire_date: string; exit_date: string | null }, today: string, onLeaveToday: boolean): Status {
  if (e.exit_date) return "Notice period";
  if (e.hire_date > today) return "Starting soon";
  if (onLeaveToday) return "On leave";
  return e.hire_date >= shift(today, -90) ? "Probation" : "Active";
}
