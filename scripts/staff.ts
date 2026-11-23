// Parses and validates data/staff.csv (the real staff list, gitignored). Pure: no I/O, so it is testable.
// Columns: full_name,email,title,office_id,department_id,brand_id,role,hire_date[,manager_email]
// ponytail: naive CSV split (quoted commas ok, escaped quotes not); swap for a CSV lib if the sheet gets messier.
import { BRANDS, DEPARTMENTS, OFFICES, ROLES } from "../lib/constants";

export type StaffRow = {
  full_name: string; email: string; title: string; office_id: string; department_id: string;
  brand_id: string; role: string; hire_date: string; manager_email: string | null;
};

const REQUIRED = ["full_name", "email", "title", "office_id", "department_id", "brand_id", "role", "hire_date"] as const;
const ALLOWED: Partial<Record<keyof StaffRow, readonly string[]>> = {
  office_id: OFFICES.map((o) => o.id), department_id: DEPARTMENTS.map((d) => d.id),
  brand_id: BRANDS.map((b) => b.id), role: ROLES.map((r) => r.id),
};
const split = (l: string) => l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((c) => c.replace(/^"|"$/g, "").trim());
const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Throws one error listing every problem (by CSV line number) so the seed never half-runs on a bad sheet. */
export function parseStaff(text: string): StaffRow[] {
  const [head = "", ...lines] = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const cols = split(head);
  const missing = REQUIRED.filter((c) => !cols.includes(c));
  if (missing.length) throw new Error(`staff.csv: missing columns ${missing.join(", ")}`);

  const problems: string[] = [];
  const rows: StaffRow[] = [];
  const lineOf = new Map<StaffRow, number>();
  lines.forEach((l, i) => {
    if (!l.trim()) return;
    const line = i + 2;
    const r = Object.fromEntries(cols.map((c, j) => [c, split(l)[j] ?? ""])) as Record<string, string>;
    for (const c of REQUIRED) if (!r[c]) problems.push(`line ${line}: empty ${c}`);
    for (const [c, ok] of Object.entries(ALLOWED)) if (r[c] && !ok!.includes(r[c])) problems.push(`line ${line}: unknown ${c} "${r[c]}"`);
    if (r.email && !r.email.includes("@")) problems.push(`line ${line}: bad email "${r.email}"`);
    if (r.hire_date && !validDate(r.hire_date)) problems.push(`line ${line}: hire_date "${r.hire_date}" is not YYYY-MM-DD`);
    const row: StaffRow = {
      full_name: r.full_name, email: r.email.toLowerCase(), title: r.title, office_id: r.office_id, department_id: r.department_id,
      brand_id: r.brand_id, role: r.role, hire_date: r.hire_date, manager_email: r.manager_email?.toLowerCase() || null,
    };
    rows.push(row);
    lineOf.set(row, line);
  });

  const seen = new Map<string, number>();
  for (const r of rows) {
    if (seen.has(r.email)) problems.push(`line ${lineOf.get(r)}: duplicate email "${r.email}" (first on line ${seen.get(r.email)})`);
    else seen.set(r.email, lineOf.get(r)!);
  }
  for (const r of rows) if (r.manager_email && !seen.has(r.manager_email)) problems.push(`line ${lineOf.get(r)}: manager_email "${r.manager_email}" is not in the list`);
  if (problems.length) throw new Error(`staff.csv has ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);

  // No manager_email: report to the department's first listed manager (leave approvals and RLS manages() need it).
  const head_ = new Map<string, string>();
  for (const r of rows) if (r.role === "manager" && !head_.has(r.department_id)) head_.set(r.department_id, r.email);
  return rows.map((r) => {
    const fallback = head_.get(r.department_id);
    return { ...r, manager_email: r.manager_email ?? (fallback && fallback !== r.email ? fallback : null) };
  });
}
