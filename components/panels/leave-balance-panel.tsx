import { fmtDate } from "@/lib/utils";

type Props = {
  balances: { leave_type: string; entitled: number; taken: number }[];
  pending: { id: string; leave_type: string; start_date: string; end_date: string }[];
};
const LABEL: Record<string, string> = { annual: "Annual leave", sick: "Sick leave", other: "Other leave" };

export function LeaveBalancePanel({ balances, pending }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {balances.map((b) => {
        const left = Math.max(0, b.entitled - b.taken);
        return (
          <div key={b.leave_type}>
            <div className="flex items-baseline justify-between text-sm">
              <span>{LABEL[b.leave_type]}</span>
              <span><span className="text-lg font-semibold tabular-nums">{left}</span> <span className="text-muted-foreground">of {b.entitled} days left</span></span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${left} of ${b.entitled} days left`}>
              <div className="h-full rounded-full bg-primary" style={{ width: `${b.entitled ? (left / b.entitled) * 100 : 0}%` }} />
            </div>
          </div>
        );
      })}
      <div>
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Pending requests</p>
        {pending.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">None.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm">
            {pending.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{LABEL[p.leave_type]}</span>
                <span className="text-muted-foreground">{fmtDate(p.start_date, { day: "numeric", month: "short" })} – {fmtDate(p.end_date, { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
