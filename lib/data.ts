import "server-only";
import { cache } from "react";
import { db } from "./supabase";
import { isStale } from "./sop";
import { BRANDS, DEPARTMENTS, OFFICES } from "./constants";
import { activeOn, attrition, directoryStatus, outCounts, shift } from "./metrics";

// The only module the UI imports for data. db() runs every query as the signed-in user (RLS).

export type Filter = { office?: string; brand?: string };

/** Whitelists URL params — filter values are interpolated into PostgREST `or()` strings, so never pass raw input. */
export function parseFilter(sp: Record<string, string | string[] | undefined>): Filter {
  const office = typeof sp.office === "string" && OFFICES.some((o) => o.id === sp.office) ? sp.office : undefined;
  const brand = typeof sp.brand === "string" && BRANDS.some((b) => b.id === sp.brand) ? sp.brand : undefined;
  return { office, brand };
}

type Employee = {
  id: string; full_name: string; email: string; title: string; office_id: string; brand_id: string;
  department_id: string; hire_date: string; exit_date: string | null;
};

/** Company "today" in Singapore time (head office), as YYYY-MM-DD. */
export const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
const monthEnd = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);

function check<T>(r: { data: T | null; error: unknown }, what: string): T {
  if (r.error) throw new Error(`${what}: ${JSON.stringify(r.error)}`);
  return r.data as T;
}

// ponytail: loads all employees (~160 rows) once per request and filters in JS; push filters into SQL past a few thousand.
const allEmployees = cache(async (): Promise<Employee[]> =>
  check(await db().from("employees").select("id, full_name, email, title, office_id, brand_id, department_id, hire_date, exit_date"), "employees"),
);
const inFilter = (e: { office_id: string; brand_id: string }, f: Filter) =>
  (!f.office || e.office_id === f.office) && (!f.brand || e.brand_id === f.brand);

async function employees(f: Filter) {
  return (await allEmployees()).filter((e) => inFilter(e, f));
}

export async function getAbsences(f: Filter, from: string, to: string, status: "approved" | "pending" = "approved") {
  const rows = check(
    await db().from("absences")
      .select("id, kind, leave_type, start_date, end_date, status, employee_id")
      .lte("start_date", to).gte("end_date", from).eq("status", status),
    "absences",
  ) as { id: string; kind: "leave" | "wfh"; leave_type: string | null; start_date: string; end_date: string; status: string; employee_id: string }[];
  const people = new Map((await employees(f)).map((e) => [e.id, e]));
  return rows
    .filter((a) => people.has(a.employee_id))
    .map((a) => ({ ...a, employee: people.get(a.employee_id)! }))
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.employee.full_name.localeCompare(b.employee.full_name));
}
export type Absence = Awaited<ReturnType<typeof getAbsences>>[number];

export async function getKpis(f: Filter) {
  const today = todayISO();
  const people = await employees(f);
  const total = people.filter((e) => activeOn(e, today)).length;
  const totalMonthAgo = people.filter((e) => activeOn(e, shift(today, -30))).length;

  const { leavers, pct } = attrition(people, today);

  const lastWeek = shift(today, -7);
  const absences = await getAbsences(f, lastWeek, today);
  const out = outCounts(absences, today);
  const outLastWeek = outCounts(absences, lastWeek);

  let jobs = db().from("job_openings").select("opened_at").eq("status", "open");
  if (f.office) jobs = jobs.eq("office_id", f.office);
  if (f.brand) jobs = jobs.eq("brand_id", f.brand);
  const openings = check(await jobs, "job_openings") as { opened_at: string }[];

  return {
    total, totalDelta: total - totalMonthAgo,
    out, outDelta: out.leave + out.wfh - (outLastWeek.leave + outLastWeek.wfh),
    openPositions: openings.length, openedLast30: openings.filter((o) => o.opened_at >= shift(today, -30)).length,
    attrition: pct, leavers,
  };
}

/** People hired in the last 90 days (or starting soon), newest first. */
export async function getNewJoiners(f: Filter, limit = 4) {
  const since = shift(todayISO(), -90);
  return (await employees(f))
    .filter((e) => e.hire_date >= since && !e.exit_date)
    .sort((a, b) => b.hire_date.localeCompare(a.hire_date))
    .slice(0, limit);
}

/** Headcount at each of the last 12 month-ends (current month = today). */
export async function getHeadcountTrend(f: Filter) {
  const today = todayISO();
  const people = await employees(f);
  const d = new Date(today);
  return Array.from({ length: 12 }, (_, i) => {
    const y = d.getUTCFullYear(), m = d.getUTCMonth() - 11 + i;
    const day = i === 11 ? today : monthEnd(y, m);
    const label = new Date(Date.UTC(y, m, 1)).toLocaleDateString("en-GB", { month: "short", year: "2-digit", timeZone: "UTC" });
    return { month: label, headcount: people.filter((e) => activeOn(e, day)).length };
  });
}

export async function getDepartmentSplit(f: Filter) {
  const today = todayISO();
  const active = (await employees(f)).filter((e) => activeOn(e, today));
  return DEPARTMENTS.map((dpt) => ({ id: dpt.id, name: dpt.name, value: active.filter((e) => e.department_id === dpt.id).length }));
}

/** SOPs for the brand filter (group-wide SOPs always included). Office doesn't apply to SOPs. */
export async function getSops(f: Filter) {
  const today = todayISO();
  let q = db().from("sops").select("id, slug, title, department_id, brand_id, owner_id, last_updated, tags, sharepoint_url").order("last_updated", { ascending: false });
  if (f.brand) q = q.or(`brand_id.eq.${f.brand},brand_id.is.null`);
  const rows = check(await q, "sops") as { id: string; slug: string; title: string; department_id: string; brand_id: string | null; owner_id: string | null; last_updated: string; tags: string[]; sharepoint_url: string | null }[];
  const names = new Map((await allEmployees()).map((e) => [e.id, e.full_name]));
  return rows.map((s) => ({ ...s, owner: s.owner_id ? names.get(s.owner_id) ?? "—" : "—", stale: isStale(s.last_updated, today) }));
}
export type Sop = Awaited<ReturnType<typeof getSops>>[number];

export async function getEvents(f: Filter) {
  let q = db().from("events").select("id, name, brand_id, office_id, start_date, end_date, sops(title, slug)").gte("start_date", todayISO()).order("start_date");
  if (f.office) q = q.eq("office_id", f.office);
  if (f.brand) q = q.eq("brand_id", f.brand);
  return check(await q, "events") as unknown as { id: string; name: string; brand_id: string; office_id: string; start_date: string; end_date: string; sops: { title: string; slug: string } | null }[];
}
export type Event = Awaited<ReturnType<typeof getEvents>>[number];

export async function getAnnouncements(f: Filter) {
  let q = db().from("announcements").select("id, title, body, office_id, published_at").order("published_at", { ascending: false }).limit(5);
  if (f.office) q = q.or(`office_id.eq.${f.office},office_id.is.null`);
  return check(await q, "announcements") as { id: string; title: string; body: string; office_id: string | null; published_at: string }[];
}

export async function getLeaveBalance(employeeId: string) {
  const year = Number(todayISO().slice(0, 4));
  const balances = check(await db().from("leave_balances").select("leave_type, entitled, taken").eq("employee_id", employeeId).eq("year", year), "leave_balances") as { leave_type: string; entitled: number; taken: number }[];
  const pending = check(await db().from("absences").select("id, leave_type, start_date, end_date").eq("employee_id", employeeId).eq("kind", "leave").eq("status", "pending").order("start_date"), "pending leave") as { id: string; leave_type: string; start_date: string; end_date: string }[];
  const order = ["annual", "sick", "other"];
  return {
    balances: balances.map((b) => ({ ...b, entitled: Number(b.entitled), taken: Number(b.taken) })).sort((a, b) => order.indexOf(a.leave_type) - order.indexOf(b.leave_type)),
    pending,
  };
}

/** Current and incoming staff with a derived status. Probation = first 90 days. */
export async function getDirectory(f: Filter) {
  const today = todayISO();
  const onLeave = new Set((await getAbsences(f, today, today)).filter((a) => a.kind === "leave").map((a) => a.employee_id));
  return (await employees(f))
    .filter((e) => !e.exit_date || e.exit_date > today)
    .map((e) => ({ ...e, status: directoryStatus(e, today, onLeave.has(e.id)) }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}
export type DirectoryRow = Awaited<ReturnType<typeof getDirectory>>[number];

/** Days left this year per employee and leave type: `left.get(id)?.annual`. */
export async function getLeaveLeft(employeeIds: string[]) {
  const left = new Map<string, Record<string, number>>();
  if (!employeeIds.length) return left;
  const rows = check(
    await db().from("leave_balances").select("employee_id, leave_type, entitled, taken").eq("year", Number(todayISO().slice(0, 4))).in("employee_id", employeeIds),
    "leave_balances",
  ) as { employee_id: string; leave_type: string; entitled: number; taken: number }[];
  for (const r of rows) left.set(r.employee_id, { ...left.get(r.employee_id), [r.leave_type]: Number(r.entitled) - Number(r.taken) });
  return left;
}
