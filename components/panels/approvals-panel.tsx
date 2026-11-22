"use client";
import Link from "next/link";
import { toast } from "sonner";
import { Avatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { dateRange, dayCount, what, type Span } from "@/lib/leave";
import type { Absence } from "@/lib/data";

export const later = () => toast("Leave approvals arrive in Phase 4.");
const when = (a: Span) => `${dateRange(a)} · ${dayCount(a)} day${dayCount(a) > 1 ? "s" : ""}`;

/** First request gets inline actions; the next few are a compact queue. */
export function ApprovalsPanel({ requests }: { requests: Absence[] }) {
  if (!requests.length) return <p className="py-6 text-center text-sm text-muted-foreground">Nothing waiting for approval.</p>;
  const [first, ...rest] = requests;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-lg border p-3.5">
        <div className="flex items-center gap-2.5">
          <Avatar name={first.employee.full_name} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{first.employee.full_name} · {what(first)}</p>
            <p className="text-[13px] text-muted-foreground">{when(first)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="lg" className="flex-1" onClick={later}>Approve</Button>
          <Button size="lg" variant="outline" className="flex-1" onClick={later}>Decline</Button>
        </div>
      </div>
      <ul className="divide-y">
        {rest.slice(0, 3).map((a) => (
          <li key={a.id} className="flex items-center gap-2.5 px-1 py-3">
            <Avatar name={a.employee.full_name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{a.employee.full_name} · {what(a)}</p>
              <p className="text-[13px] text-muted-foreground">{when(a)}</p>
            </div>
            <Button variant="link" className="px-0" onClick={later}>Review</Button>
          </li>
        ))}
      </ul>
      <Link href="/whos-out" className="text-sm font-medium text-primary hover:underline">See all approvals →</Link>
    </div>
  );
}
