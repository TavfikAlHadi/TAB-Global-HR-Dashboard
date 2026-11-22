import { FileText } from "lucide-react";
import { BRAND_NAME, OFFICE_NAME } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";
import type { Event } from "@/lib/data";

export function EventsPanel({ events, limit }: { events: Event[]; limit?: number }) {
  const list = limit ? events.slice(0, limit) : events;
  if (!list.length) return <p className="py-6 text-center text-sm text-muted-foreground">No upcoming events for this filter.</p>;
  return (
    <ul className="flex max-h-96 flex-col gap-3.5 overflow-y-auto">
      {list.map((e) => (
        <li key={e.id} className="flex items-center gap-3.5">
          <div className="flex w-12 shrink-0 flex-col items-center rounded-[10px] border py-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase">{fmtDate(e.start_date, { month: "short" })}</span>
            <span className="text-lg leading-tight font-semibold tabular-nums">{fmtDate(e.start_date, { day: "2-digit" })}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{e.name}</p>
            <p className="text-xs text-muted-foreground">
              {BRAND_NAME[e.brand_id]} · {OFFICE_NAME[e.office_id]}
              {e.end_date !== e.start_date && ` · until ${fmtDate(e.end_date, { day: "numeric", month: "short" })}`}
            </p>
            {e.sops && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-primary">
                <FileText className="size-3" aria-hidden /> SOP: {e.sops.title}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
