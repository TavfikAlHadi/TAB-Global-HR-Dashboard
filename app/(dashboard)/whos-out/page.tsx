import { connection } from "next/server";
import { getAbsences, getKpis, getLeaveLeft, parseFilter, todayISO } from "@/lib/data";
import { currentRole, canViewAll } from "@/lib/role";
import { fmtDate, workWeek } from "@/lib/utils";
import { KpiCard } from "@/components/kpi-card";
import { PageTitle } from "@/components/page-title";
import { Panel } from "@/components/panel";
import { TeamCalendar } from "@/components/team-calendar";
import { LeaveRequestsPanel } from "@/components/panels/leave-requests-panel";

const weekLabel = (days: string[]) => {
  const [a, b] = [days[0], days[4]];
  const sameMonth = a.slice(0, 7) === b.slice(0, 7);
  return `Week of ${fmtDate(a, sameMonth ? { day: "numeric" } : { day: "numeric", month: "long" })}–${fmtDate(b, { day: "numeric", month: "long", year: "numeric" })}`;
};

export default async function WhosOutPage({ searchParams }: PageProps<"/whos-out">) {
  await connection(); // "today" and "this week"
  const filter = parseFilter(await searchParams);
  const hr = canViewAll(await currentRole());
  const today = todayISO();
  const days = workWeek(today);
  // Pending requests are manager/HR-only.
  const [k, approved, pendingWeek, pending] = await Promise.all([
    getKpis(filter),
    getAbsences(filter, days[0], days[4]),
    hr ? getAbsences(filter, days[0], days[4], "pending") : [],
    hr ? getAbsences(filter, today, "9999-12-31", "pending") : [],
  ]);
  const left = hr ? Object.fromEntries(await getLeaveLeft([...new Set(pending.map((a) => a.employee_id))])) : {};

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Leave & attendance" subtitle={weekLabel(days)} />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Attendance today">
        {hr && <KpiCard label="Pending requests" value={pending.length} />}
        <KpiCard label="In office today" value={k.total - k.out.leave - k.out.wfh} />
        <KpiCard label="WFH today" value={k.out.wfh} />
        <KpiCard label="On leave today" value={k.out.leave} />
      </section>
      <Panel title="Team calendar">
        <TeamCalendar absences={[...approved, ...pendingWeek]} days={days} today={today} />
      </Panel>
      {hr && (
        <Panel title="Leave requests" action={<span className="text-sm text-muted-foreground">{pending.length} awaiting decision</span>}>
          <LeaveRequestsPanel requests={pending} left={left} today={today} />
        </Panel>
      )}
    </div>
  );
}
