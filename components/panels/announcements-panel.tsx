import { OFFICE_NAME } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";

type A = { id: string; title: string; body: string; office_id: string | null; published_at: string };

export function AnnouncementsPanel({ items }: { items: A[] }) {
  return (
    <ul className="space-y-3">
      {items.map((a) => (
        <li key={a.id} className="border-l-2 border-primary pl-3">
          <p className="text-sm font-medium">{a.title}</p>
          <p className="text-sm text-muted-foreground">{a.body}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{fmtDate(a.published_at)} · {a.office_id ? OFFICE_NAME[a.office_id] : "All offices"}</p>
        </li>
      ))}
    </ul>
  );
}
