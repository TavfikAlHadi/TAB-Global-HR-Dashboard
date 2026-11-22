// Seeds Supabase with fictional TAB Global demo data. Idempotent: wipes and re-inserts.
// Run: npm run seed   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local)
// ponytail: dates are relative to the day you seed; rerun the seed to refresh the demo.
import { createClient } from "@supabase/supabase-js";
import matter from "gray-matter";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { OFFICES, BRANDS, DEPARTMENTS, DEMO_EMPLOYEE_EMAIL } from "../lib/constants";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

// Deterministic PRNG so every seed produces the same people.
let s = 20261122;
const rand = () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const isWeekday = (d: Date) => d.getUTCDay() % 6 !== 0;
const quarterStart = new Date(Date.UTC(today.getUTCFullYear(), Math.floor(today.getUTCMonth() / 3) * 3, 1));

const NAMES: Record<string, { first: string[]; last: string[] }> = {
  SG: { first: ["Wei Jie", "Hui Min", "Jun Hao", "Siti", "Priya", "Kai Wen", "Jasmine", "Ryan", "Shu Fen", "Darren"], last: ["Tan", "Lim", "Ng", "Ong", "Goh", "Chua", "Menon", "Koh", "Teo", "Yeo"] },
  BJ: { first: ["Li Na", "Hao", "Xin Yi", "Jun", "Mei", "Lei", "Yan", "Bo", "Qing", "Tao"], last: ["Wang", "Zhang", "Liu", "Chen", "Zhao", "Huang", "Zhou", "Wu", "Xu", "Sun"] },
  DXB: { first: ["Omar", "Fatima", "Rahul", "Layla", "Hassan", "Anika", "Yusuf", "Mariam", "Karim", "Neha"], last: ["Al Mansoori", "Khan", "Haddad", "Sharma", "Farouk", "Pillai", "Nasser", "Qureshi", "Saleh", "Iyer"] },
  KL: { first: ["Aiman", "Nurul", "Jia Hui", "Hafiz", "Kavitha", "Wei Ming", "Farah", "Ravi", "Siew Ling", "Amir"], last: ["Abdullah", "Ismail", "Lee", "Rahman", "Subramaniam", "Wong", "Yusof", "Krishnan", "Chong", "Hamid"] },
  MNL: { first: ["Maria", "Jose", "Angela", "Paolo", "Kristine", "Miguel", "Bea", "Carlo", "Patricia", "Joshua"], last: ["Santos", "Reyes", "Cruz", "Bautista", "Garcia", "Mendoza", "Torres", "Villanueva", "Ramos", "Aquino"] },
};
const OFFICE_HEADCOUNT: Record<string, number> = { SG: 52, KL: 34, MNL: 26, BJ: 20, DXB: 16 }; // = 148
const DEPT_WEIGHTS: [string, number][] = [["editorial", 26], ["research", 24], ["events", 28], ["sales", 22], ["marketing", 16], ["technology", 14], ["finance-admin", 18]];
const DEPT_BRANDS: Record<string, string[]> = {
  editorial: ["tab", "tab", "wealth-society", "radiofinance"],
  research: ["tabinsights", "tabinsights", "bankquality"],
  events: ["tab", "tab", "wealth-society", "banking-academy"],
  sales: ["tab", "tabinsights", "skill-store", "banking-academy"],
  marketing: ["tab", "wealth-society", "skill-store"],
  technology: ["tab"],
  "finance-admin": ["tab"],
};
const TITLES: Record<string, string[]> = {
  editorial: ["Journalist", "Senior Journalist", "Sub-Editor", "Producer"],
  research: ["Research Analyst", "Senior Analyst", "Data Analyst"],
  events: ["Event Manager", "Conference Producer", "Event Executive", "Delegate Sales Executive"],
  sales: ["Account Manager", "Business Development Manager", "Sales Executive"],
  marketing: ["Marketing Executive", "Digital Marketing Specialist", "Designer"],
  technology: ["Software Engineer", "IT Support Engineer", "Data Engineer"],
  "finance-admin": ["Accountant", "Office Manager", "HR Executive", "Finance Executive"],
};
const weightedDept = () => {
  let r = rand() * DEPT_WEIGHTS.reduce((a, [, w]) => a + w, 0);
  for (const [d, w] of DEPT_WEIGHTS) if ((r -= w) < 0) return d;
  return "editorial";
};

type Emp = {
  id: string; full_name: string; email: string; title: string; office_id: string; brand_id: string;
  department_id: string; role: string; manager_id: string | null; hire_date: string; exit_date: string | null;
};
const emails = new Set<string>();
const mkEmail = (name: string) => {
  const base = name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");
  let e = `${base}@tabglobal.example`;
  for (let n = 2; emails.has(e); n++) e = `${base}${n}@tabglobal.example`;
  emails.add(e);
  return e;
};
const oldHire = () => iso(addDays(today, -int(400, 3600)));

// Named people: SOP owners (department heads), HR, and the demo employee.
const named: Omit<Emp, "id" | "email" | "manager_id" | "exit_date">[] = [
  { full_name: "Rachel Lim", title: "Head of Editorial", office_id: "SG", brand_id: "tab", department_id: "editorial", role: "manager", hire_date: oldHire() },
  { full_name: "Daniel Wong", title: "Head of Research", office_id: "SG", brand_id: "tabinsights", department_id: "research", role: "manager", hire_date: oldHire() },
  { full_name: "Aisha Rahman", title: "Head of Events & Forums", office_id: "KL", brand_id: "tab", department_id: "events", role: "manager", hire_date: oldHire() },
  { full_name: "Marcus Tan", title: "Head of Sales", office_id: "SG", brand_id: "tab", department_id: "sales", role: "manager", hire_date: oldHire() },
  { full_name: "Sofia Reyes", title: "Head of Marketing", office_id: "MNL", brand_id: "tab", department_id: "marketing", role: "manager", hire_date: oldHire() },
  { full_name: "Arjun Nair", title: "Head of Technology", office_id: "KL", brand_id: "tab", department_id: "technology", role: "manager", hire_date: oldHire() },
  { full_name: "Grace Liu", title: "Head of Finance & Admin", office_id: "SG", brand_id: "tab", department_id: "finance-admin", role: "super_admin", hire_date: oldHire() },
  { full_name: "Nur Hidayah", title: "HR Manager", office_id: "KL", brand_id: "tab", department_id: "finance-admin", role: "hr_admin", hire_date: oldHire() },
  { full_name: "Mei Ling Tan", title: "Marketing Executive", office_id: "SG", brand_id: "tab", department_id: "marketing", role: "employee", hire_date: oldHire() },
];

function buildEmployees(): Emp[] {
  const heads: Record<string, string> = {};
  const out: Emp[] = named.map((n) => {
    const e: Emp = { ...n, id: randomUUID(), email: n.full_name === "Mei Ling Tan" ? DEMO_EMPLOYEE_EMAIL : mkEmail(n.full_name), manager_id: null, exit_date: null };
    emails.add(e.email);
    if (n.role !== "employee" && n.full_name !== "Nur Hidayah") heads[n.department_id] = e.id;
    return e;
  });
  out.find((e) => e.full_name === "Mei Ling Tan")!.manager_id = heads.marketing;
  out.find((e) => e.full_name === "Nur Hidayah")!.manager_id = heads["finance-admin"];

  const left = { ...OFFICE_HEADCOUNT };
  for (const e of out) left[e.office_id]--;
  const slots = Object.entries(left).flatMap(([o, n]) => Array(n).fill(o) as string[]);
  // 6 hires this quarter, ~18 more over the past 12 months, the rest long-tenured.
  slots.forEach((office, i) => {
    const dept = weightedDept();
    const name = `${pick(NAMES[office].first)} ${pick(NAMES[office].last)}`;
    const qDays = Math.max(1, Math.round((today.getTime() - quarterStart.getTime()) / 864e5));
    const hire = i < 6 ? addDays(quarterStart, int(0, qDays - 1)) : i < 24 ? addDays(quarterStart, -int(1, 330)) : addDays(today, -int(400, 3600));
    out.push({
      id: randomUUID(), full_name: name, email: mkEmail(name), title: pick(TITLES[dept]), office_id: office,
      brand_id: pick(DEPT_BRANDS[dept]), department_id: dept, role: "employee", manager_id: heads[dept] ?? null,
      hire_date: iso(hire), exit_date: null,
    });
  });
  // 10 leavers over the past 12 months, so the trend line has real movement.
  for (let i = 0; i < 10; i++) {
    const office = pick(OFFICES).id;
    const dept = weightedDept();
    const name = `${pick(NAMES[office].first)} ${pick(NAMES[office].last)}`;
    out.push({
      id: randomUUID(), full_name: name, email: mkEmail(name), title: pick(TITLES[dept]), office_id: office,
      brand_id: pick(DEPT_BRANDS[dept]), department_id: dept, role: "employee", manager_id: heads[dept] ?? null,
      hire_date: iso(addDays(today, -int(500, 2000))), exit_date: iso(addDays(today, -int(5, 350))),
    });
  }
  return out;
}

function buildAbsences(active: Emp[]) {
  const rows: object[] = [];
  for (const e of active) {
    // Two leave blocks within +/- 8 weeks.
    for (let k = 0; k < 2; k++) {
      const start = addDays(today, int(-56, 56));
      const end = addDays(start, int(0, 4));
      const type = rand() < 0.75 ? "annual" : rand() < 0.7 ? "sick" : "other";
      rows.push({ employee_id: e.id, kind: "leave", leave_type: type, start_date: iso(start), end_date: iso(end), status: start > today && rand() < 0.25 ? "pending" : "approved" });
    }
    // Ad-hoc WFH days (~9% of weekdays).
    for (let d = -56; d <= 56; d++) {
      const day = addDays(today, d);
      if (isWeekday(day) && rand() < 0.09) rows.push({ employee_id: e.id, kind: "wfh", leave_type: null, start_date: iso(day), end_date: iso(day), status: "approved" });
    }
  }
  return rows;
}

function readSops(byName: Map<string, string>) {
  const dir = join(process.cwd(), "content/sops");
  return readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => {
    const { data, content } = matter(readFileSync(join(dir, f), "utf8"));
    const owner = byName.get(data.owner);
    if (!owner) throw new Error(`${f}: owner "${data.owner}" is not a seeded employee`);
    return {
      id: randomUUID(), slug: f.replace(/\.md$/, ""), title: data.title, department_id: data.department,
      brand_id: data.brand === "all" ? null : data.brand, owner_id: owner,
      last_updated: data.last_updated instanceof Date ? iso(data.last_updated) : String(data.last_updated),
      tags: data.tags ?? [], sharepoint_url: data.sharepoint_url ?? null, body_md: content.trim(),
    };
  });
}

async function run(label: string, p: PromiseLike<{ error: unknown }>) {
  const { error } = await p;
  if (error) throw new Error(`${label}: ${JSON.stringify(error)}`);
}
async function insertChunked(table: string, rows: object[]) {
  for (let i = 0; i < rows.length; i += 500) await run(`insert ${table}`, db.from(table).insert(rows.slice(i, i + 500)));
}

async function main() {
  // Wipe in FK order.
  for (const t of ["events", "announcements", "job_openings", "sops", "absences"]) await run(`wipe ${t}`, db.from(t).delete().not("id", "is", null));
  await run("wipe leave_balances", db.from("leave_balances").delete().gte("year", 0));
  await run("unlink managers", db.from("employees").update({ manager_id: null }).not("id", "is", null));
  await run("wipe employees", db.from("employees").delete().not("id", "is", null));

  await run("offices", db.from("offices").upsert([...OFFICES]));
  await run("brands", db.from("brands").upsert([...BRANDS]));
  await run("departments", db.from("departments").upsert([...DEPARTMENTS]));

  const employees = buildEmployees();
  // Insert without manager links first, then link (self-reference).
  await insertChunked("employees", employees.map((e) => ({ ...e, manager_id: null })));
  for (const e of employees.filter((e) => e.manager_id)) await run("link manager", db.from("employees").update({ manager_id: e.manager_id }).eq("id", e.id));

  const active = employees.filter((e) => !e.exit_date);
  await insertChunked("absences", buildAbsences(active));

  const year = today.getUTCFullYear();
  await insertChunked("leave_balances", active.flatMap((e) => [
    { employee_id: e.id, year, leave_type: "annual", entitled: 18, taken: int(2, 14) },
    { employee_id: e.id, year, leave_type: "sick", entitled: 14, taken: int(0, 5) },
    { employee_id: e.id, year, leave_type: "other", entitled: 5, taken: int(0, 2) },
  ]));

  const sops = readSops(new Map(employees.map((e) => [e.full_name, e.id])));
  await insertChunked("sops", sops);
  const sopId = (slug: string) => sops.find((x) => x.slug === slug)!.id;

  const EVENTS: [string, string, string, number, number, string][] = [
    ["Future of Finance Summit", "tab", "SG", 9, 2, "forum-speaker-management"],
    ["Global Wholesale Banking Forum", "tab", "SG", 16, 1, "event-day-run-sheet"],
    ["Wealth & Society Private Roundtable", "wealth-society", "DXB", 20, 0, "private-roundtable-protocol"],
    ["TABInsights Ranking Briefing (Virtual)", "tabinsights", "KL", 24, 0, "virtual-event-production"],
    ["Middle East Retail Banking Forum", "tab", "DXB", 33, 1, "venue-contracting"],
    ["RadioFinance Live: Year Ahead", "radiofinance", "SG", 38, 0, "virtual-event-production"],
    ["China Banking Leaders Dialogue", "tab", "BJ", 45, 1, "forum-speaker-management"],
    ["Banking Academy: Risk Leadership Programme", "banking-academy", "KL", 52, 3, "event-health-and-safety"],
    ["BankQuality Customer Experience Awards", "bankquality", "MNL", 60, 0, "delegate-registration-and-badging"],
    ["Philippine Financial Services Forum", "tab", "MNL", 68, 1, "event-day-run-sheet"],
    ["Wealth & Society Family Office Forum", "wealth-society", "SG", 81, 1, "sponsor-deliverables-tracking"],
    ["Skill Store Leadership Masterclass", "skill-store", "KL", 95, 1, "delegate-registration-and-badging"],
    ["Asian Banker Leadership Achievement Awards", "tab", "BJ", 110, 0, "forum-speaker-management"],
  ];
  await insertChunked("events", EVENTS.map(([name, brand_id, office_id, inDays, len, sop]) => ({
    name, brand_id, office_id, start_date: iso(addDays(today, inDays)), end_date: iso(addDays(today, inDays + len)), sop_id: sopId(sop),
  })));

  await insertChunked("announcements", [
    { title: "Year-end office closure", body: "All offices close from 24 Dec to 1 Jan. Submit remaining annual leave by 5 Dec.", office_id: null, published_at: addDays(today, -1).toISOString() },
    { title: "Future of Finance Summit volunteers", body: "Events & Forums needs eight volunteers for registration desk duty. Sign up with Aisha Rahman.", office_id: "SG", published_at: addDays(today, -3).toISOString() },
    { title: "Updated WFH arrangement SOP", body: "The Work From Home Arrangement SOP now sets core hours at 10:00-16:00. Please review it in the SOP Library.", office_id: null, published_at: addDays(today, -6).toISOString() },
    { title: "KL office pantry upgrade", body: "The KL pantry will be closed on Thursday for refurbishment.", office_id: "KL", published_at: addDays(today, -8).toISOString() },
    { title: "Welcome to our new joiners", body: "Six colleagues joined this quarter across Singapore, Kuala Lumpur and Manila. Say hello!", office_id: null, published_at: addDays(today, -12).toISOString() },
    { title: "Manila office fire drill", body: "Fire drill on Tuesday at 15:00. Follow the floor wardens.", office_id: "MNL", published_at: addDays(today, -15).toISOString() },
  ]);

  const OPEN: [string, string, string, string, number][] = [
    ["Senior Journalist, Banking", "editorial", "SG", "tab", 12],
    ["Research Analyst, Rankings", "research", "KL", "tabinsights", 20],
    ["Data Analyst", "research", "SG", "bankquality", 34],
    ["Conference Producer", "events", "DXB", "tab", 8],
    ["Event Executive", "events", "MNL", "tab", 41],
    ["Business Development Manager", "sales", "BJ", "tab", 15],
    ["Account Manager, Subscriptions", "sales", "SG", "tabinsights", 52],
    ["Digital Marketing Specialist", "marketing", "MNL", "wealth-society", 5],
    ["Software Engineer", "technology", "KL", "tab", 27],
  ];
  await insertChunked("job_openings", [
    ...OPEN.map(([title, department_id, office_id, brand_id, ago]) => ({ title, department_id, office_id, brand_id, status: "open", opened_at: iso(addDays(today, -ago)) })),
    { title: "Podcast Producer", department_id: "editorial", office_id: "SG", brand_id: "radiofinance", status: "closed", opened_at: iso(addDays(today, -90)) },
    { title: "Finance Executive", department_id: "finance-admin", office_id: "KL", brand_id: "tab", status: "closed", opened_at: iso(addDays(today, -120)) },
  ]);

  const hires = active.filter((e) => new Date(e.hire_date) >= quarterStart).length;
  console.log(`Seeded ${active.length} active employees (${hires} hired this quarter), ${sops.length} SOPs, ${EVENTS.length} events, ${OPEN.length} open positions.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
