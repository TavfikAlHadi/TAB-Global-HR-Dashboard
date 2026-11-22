"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { PageTitle } from "@/components/page-title";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DEPARTMENTS, DEPARTMENT_NAME, OFFICE_NAME, STATUSES, type Status } from "@/lib/constants";
import { cn, fmtDate } from "@/lib/utils";

type Row = { id: string; full_name: string; email: string; title: string; office_id: string; department_id: string; hire_date: string; status?: Status };

const PAGE = 10;
const TONE: Record<Status, string> = {
  Active: "bg-green-100 text-green-800",
  "On leave": "bg-blue-100 text-blue-800",
  Probation: "bg-amber-100 text-amber-800",
  "Starting soon": "bg-muted text-foreground/80",
  "Notice period": "bg-red-100 text-red-800",
};
const fieldCls = "flex flex-col gap-1.5 text-[13px] font-medium text-foreground/80";
const selectCls = "h-11 rounded-[10px] border bg-card px-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

function downloadCsv(rows: Row[], withStatus: boolean) {
  const head = ["Name", "Email", "Role", "Department", "Office", "Start date", ...(withStatus ? ["Status"] : [])];
  const body = rows.map((r) => [r.full_name, r.email, r.title, DEPARTMENT_NAME[r.department_id], OFFICE_NAME[r.office_id], r.hire_date, ...(withStatus ? [r.status] : [])]);
  const csv = [head, ...body].map((line) => line.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "employees.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Search / department / status filter and pagination run client-side; office and brand come from the URL filter. */
export function DirectoryTable({ rows, showStatus }: { rows: Row[]; showStatus: boolean }) {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const needle = q.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (!dept || r.department_id === dept) &&
      (!status || r.status === status) &&
      (!needle || [r.full_name, r.title, r.email].some((t) => t.toLowerCase().includes(needle))),
  );
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const at = Math.min(page, pages - 1);
  const slice = shown.slice(at * PAGE, at * PAGE + PAGE);
  const first = Math.max(0, Math.min(at - 2, pages - 5));
  const nums = Array.from({ length: Math.min(5, pages) }, (_, i) => first + i);
  const filter = <T,>(set: (v: T) => void) => (v: T) => { set(v); setPage(0); };
  const offices = new Set(rows.map((r) => r.office_id)).size;
  const depts = new Set(rows.map((r) => r.department_id)).size;

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Employee directory" subtitle={`${rows.length} people across ${depts} departments and ${offices} office${offices === 1 ? "" : "s"}`}>
        <Button variant="outline" size="lg" className="px-3.5" onClick={() => downloadCsv(shown, showStatus)}>
          <Download aria-hidden /> Export CSV
        </Button>
      </PageTitle>

      <Card className="flex-row flex-wrap items-end gap-3 px-4" aria-label="Filters" role="search">
        <label className={cn(fieldCls, "min-w-60 flex-[2_1_16rem]")}>
          Search
          <span className="relative">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input type="search" value={q} onChange={(e) => filter(setQ)(e.target.value)} placeholder="Name, role or email" className="h-11 rounded-[10px] pl-9" />
          </span>
        </label>
        <label className={cn(fieldCls, "flex-[1_1_10rem]")}>
          Department
          <select className={selectCls} value={dept} onChange={(e) => filter(setDept)(e.target.value)}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        {showStatus && (
          <label className={cn(fieldCls, "flex-[1_1_10rem]")}>
            Status
            <select className={selectCls} value={status} onChange={(e) => filter(setStatus)(e.target.value)}>
              <option value="">Any status</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        )}
      </Card>

      <Card className="gap-0 py-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b text-xs tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-5 py-3.5 font-semibold">Name</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Role</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Department</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Office</th>
                <th scope="col" className="px-4 py-3.5 font-semibold">Start date</th>
                {showStatus && <th scope="col" className="px-5 py-3.5 font-semibold">Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {slice.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.full_name} />
                      <div className="min-w-0">
                        <p className="font-semibold">{r.full_name}</p>
                        <a href={`mailto:${r.email}`} className="text-[13px] text-muted-foreground hover:text-primary">{r.email}</a>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.title}</td>
                  <td className="px-4 py-3">{DEPARTMENT_NAME[r.department_id]}</td>
                  <td className="px-4 py-3">{OFFICE_NAME[r.office_id]}</td>
                  <td className="px-4 py-3 tabular-nums">{fmtDate(r.hire_date)}</td>
                  {showStatus && <td className="px-5 py-3"><Badge className={cn("h-6 px-2.5", TONE[r.status!])}>{r.status}</Badge></td>}
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No one matches these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3.5 text-sm">
          <span className="text-muted-foreground">
            {shown.length ? `Showing ${at * PAGE + 1}–${at * PAGE + slice.length} of ${shown.length}` : "Showing 0"}
          </span>
          <div className="flex gap-1.5">
            <Button variant="outline" size="icon-lg" aria-label="Previous page" disabled={at === 0} onClick={() => setPage(at - 1)}><ChevronLeft /></Button>
            {nums.map((n) => (
              <Button key={n} variant={n === at ? "default" : "outline"} size="icon-lg" aria-current={n === at ? "page" : undefined} onClick={() => setPage(n)}>{n + 1}</Button>
            ))}
            <Button variant="outline" size="icon-lg" aria-label="Next page" disabled={at === pages - 1} onClick={() => setPage(at + 1)}><ChevronRight /></Button>
          </div>
        </nav>
      </Card>
    </div>
  );
}
