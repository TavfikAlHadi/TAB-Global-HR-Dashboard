import { Avatar } from "@/components/avatar";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENT_NAME } from "@/lib/constants";
import { fmtDate } from "@/lib/utils";

type Joiner = { id: string; full_name: string; title: string; department_id: string; hire_date: string };

/** Onboarding = first 30 days; future start dates read "Starts …", older ones "Joined …". */
export function NewJoinersPanel({ joiners, today }: { joiners: Joiner[]; today: string }) {
  if (!joiners.length) return <p className="py-4 text-center text-sm text-muted-foreground">No new joiners in the last 90 days.</p>;
  const monthAgo = new Date(Date.parse(today) - 30 * 864e5).toISOString().slice(0, 10);
  const day = (iso: string) => fmtDate(iso, { day: "numeric", month: "short" });
  return (
    <ul className="flex flex-col gap-3.5">
      {joiners.map((j) => (
        <li key={j.id} className="flex items-center gap-2.5">
          <Avatar name={j.full_name} className="size-8 text-xs" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{j.full_name}</p>
            <p className="truncate text-[13px] text-muted-foreground">{j.title} · {DEPARTMENT_NAME[j.department_id]}</p>
          </div>
          {j.hire_date > today ? (
            <Badge variant="secondary" className="bg-muted text-foreground/80">Starts {day(j.hire_date)}</Badge>
          ) : j.hire_date >= monthAgo ? (
            <Badge className="bg-green-100 text-green-800">Onboarding</Badge>
          ) : (
            <Badge variant="secondary" className="bg-muted text-foreground/80">Joined {day(j.hire_date)}</Badge>
          )}
        </li>
      ))}
    </ul>
  );
}
