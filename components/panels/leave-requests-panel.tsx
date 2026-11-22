"use client";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { later } from "@/components/panels/approvals-panel";
import { DEPARTMENT_NAME, OFFICE_NAME } from "@/lib/constants";
import { dateRange, dayCount, what } from "@/lib/leave";
import type { Absence } from "@/lib/data";

/** `left` = days left this year per leave type, keyed by employee id. */
export function LeaveRequestsPanel({ requests, left, today }: { requests: Absence[]; left: Record<string, Record<string, number>>; today: string }) {
  if (!requests.length) return <p className="py-6 text-center text-sm text-muted-foreground">No requests waiting.</p>;
  return (
    <ul className="divide-y divide-border/60">
      {requests.map((a) => {
        const n = dayCount(a);
        const bal = a.leave_type ? left[a.employee_id]?.[a.leave_type] : undefined;
        const lead = Math.round((Date.parse(a.start_date) - Date.parse(today)) / 864e5);
        return (
          <li key={a.id} className="flex flex-wrap items-center gap-4 py-3.5">
            <div className="flex min-w-0 flex-[2_1_14rem] items-center gap-3">
              <Avatar name={a.employee.full_name} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{a.employee.full_name}</p>
                <p className="truncate text-[13px] text-muted-foreground">{DEPARTMENT_NAME[a.employee.department_id]} · {OFFICE_NAME[a.employee.office_id]}</p>
              </div>
            </div>
            <div className="flex-[1_1_9rem] text-sm">
              <p className="font-medium">{what(a)}</p>
              <p className="text-[13px] text-muted-foreground">{lead <= 0 ? "Starts today" : `Starts in ${lead} day${lead > 1 ? "s" : ""}`}</p>
            </div>
            <div className="flex-[1_1_9rem] text-sm">
              <p className="font-medium">{dateRange(a)}</p>
              <p className="text-[13px] text-muted-foreground">
                {n} day{n > 1 ? "s" : ""}{bal !== undefined && ` · ${Math.max(0, bal - n)} left after`}
              </p>
            </div>
            <div className="flex flex-[1_1_12rem] justify-end gap-2">
              <Button size="lg" variant="outline" className="px-4" onClick={later}>Decline</Button>
              <Button size="lg" className="px-4" onClick={later}>Approve</Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
