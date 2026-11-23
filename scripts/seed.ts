// Seeds Supabase with the real staff list (data/staff.csv) plus demo leave, events and announcements.
// Idempotent: wipes and re-inserts. Run: npm run seed   (needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
// ponytail: dates are relative to the day you seed; rerun the seed to refresh the demo.
import { createClient } from "@supabase/supabase-js";
import matter from "gray-matter";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { OFFICES, BRANDS, DEPARTMENTS } from "../lib/constants";
import { parseStaff } from "./staff";


const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
const db = createClient(url, key, { auth: { persistSession: false } });

// Deterministic PRNG so every seed produces the same demo leave.
let s = 20261122;
const rand = () => ((s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const isWeekday = (d: Date) => d.getUTCDay() % 6 !== 0;

type Emp = {
  id: string; full_name: string; email: string; title: string; office_id: string; brand_id: string;
  department_id: string; role: string; manager_id: string | null; hire_date: string; exit_date: string | null;
};

// Real staff list (data/staff.csv), kept out of git: this repo is public. Parsing + validation: ./staff.ts
function readStaff(): Emp[] {
  const rows = parseStaff(readFileSync(join(process.cwd(), "data/staff.csv"), "utf8"));
  const ids = new Map(rows.map((r) => [r.email, randomUUID()]));
  const orphans = rows.filter((r) => !r.manager_email && r.role === "employee").length;
  if (orphans) console.warn(`⚠ ${orphans} employee(s) have no manager: their leave has no approver and managers see no team. Add a manager_email column or mark department heads role=manager.`);
  return rows.map(({ manager_email, ...r }) => ({
    ...r, id: ids.get(r.email)!, manager_id: manager_email ? ids.get(manager_email)! : null, exit_date: null,
  }));
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

function readSops(employees: Emp[]) {
  const byName = new Map(employees.map((e) => [e.full_name, e.id]));
  // SOP front matter still names demo owners; fall back to the department's most senior seeded person.
  const rank = ["super_admin", "hr_admin", "manager", "employee"];
  const deptOwner = (dept: string) => employees.filter((e) => e.department_id === dept).sort((a, b) => rank.indexOf(a.role) - rank.indexOf(b.role))[0]?.id;
  const dir = join(process.cwd(), "content/sops");
  return readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => {
    const { data, content } = matter(readFileSync(join(dir, f), "utf8"));
    const owner = byName.get(data.owner) ?? deptOwner(data.department);
    if (!owner) throw new Error(`${f}: no owner "${data.owner}" and no staff in department "${data.department}"`);
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
  // Parse first: a bad sheet must fail before anything is wiped.
  const employees = readStaff();

  // Wipe in FK order.
  for (const t of ["events", "announcements", "job_openings", "sops", "absences"]) await run(`wipe ${t}`, db.from(t).delete().not("id", "is", null));
  await run("wipe leave_balances", db.from("leave_balances").delete().gte("year", 0));
  await run("unlink managers", db.from("employees").update({ manager_id: null }).not("id", "is", null));
  await run("wipe employees", db.from("employees").delete().not("id", "is", null));

  await run("offices", db.from("offices").upsert([...OFFICES]));
  await run("brands", db.from("brands").upsert([...BRANDS]));
  await run("departments", db.from("departments").upsert([...DEPARTMENTS]));

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

  const sops = readSops(employees);
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
    { title: "Future of Finance Summit volunteers", body: "Events & Forums needs eight volunteers for registration desk duty. Sign up with the Events & Forums team.", office_id: "SG", published_at: addDays(today, -3).toISOString() },
    { title: "Updated WFH arrangement SOP", body: "The Work From Home Arrangement SOP now sets core hours at 10:00-16:00. Please review it in the SOP Library.", office_id: null, published_at: addDays(today, -6).toISOString() },
    { title: "KL office pantry upgrade", body: "The KL pantry will be closed on Thursday for refurbishment.", office_id: "KL", published_at: addDays(today, -8).toISOString() },
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

  console.log(`Seeded ${active.length} employees, ${sops.length} SOPs, ${EVENTS.length} events, ${OPEN.length} open positions.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
