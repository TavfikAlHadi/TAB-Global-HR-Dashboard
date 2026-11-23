import { connection } from "next/server";
import { currentRole, currentEmployee, canViewAll } from "@/lib/role";
import {
  parseFilter, todayISO, getKpis, getHeadcountTrend, getDepartmentSplit, getSops, getEvents,
  getAbsences, getAnnouncements, getLeaveBalance, getNewJoiners, type Filter,
} from "@/lib/data";
import { BRAND_NAME, DEPARTMENT_NAME, OFFICE_NAME } from "@/lib/constants";
import { fmtDate, workWeek } from "@/lib/utils";
import { Panel } from "@/components/panel";
import { PageTitle } from "@/components/page-title";
import { KpiCard, deltaTrend } from "@/components/kpi-card";
import { HeadcountChart } from "@/components/charts/headcount-chart";
import { DepartmentPie } from "@/components/charts/department-pie";
import { Badge } from "@/components/ui/badge";
import { ApprovalsPanel } from "@/components/panels/approvals-panel";
import { OutThisWeekPanel } from "@/components/panels/out-this-week-panel";
import { NewJoinersPanel } from "@/components/panels/new-joiners-panel";
import { SopPanel } from "@/components/panels/sop-panel";
import { EventsPanel } from "@/components/panels/events-panel";
import { WhosOutPanel } from "@/components/panels/whos-out-panel";
import { LeaveBalancePanel } from "@/components/panels/leave-balance-panel";
import { AnnouncementsPanel } from "@/components/panels/announcements-panel";

const scopeLabel = (f: Filter) => [f.office && OFFICE_NAME[f.office], f.brand && BRAND_NAME[f.brand]].filter(Boolean).join(" · ") || "All offices and brands";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  await connection(); // dates are "today": render per request, never prerender
  const filter = parseFilter(await searchParams);
  const role = await currentRole();
  return canViewAll(role) ? <HrView filter={filter} /> : <StaffView filter={filter} />;
}

async function HrView({ filter }: { filter: Filter }) {
  const today = todayISO();
  const days = workWeek(today);
  const [k, trend, depts, sops, events, pending, week, joiners] = await Promise.all([
    getKpis(filter), getHeadcountTrend(filter), getDepartmentSplit(filter), getSops(filter), getEvents(filter),
    getAbsences(filter, today, "9999-12-31", "pending"), getAbsences(filter, days[0], days[4]), getNewJoiners(filter),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="HR overview" subtitle={`${fmtDate(today, { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${scopeLabel(filter)}`} />
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" aria-label="Key figures">
        <KpiCard label="Total employees" value={k.total} trend={deltaTrend(k.totalDelta, "vs last month")} />
        <KpiCard label="Open positions" value={k.openPositions} trend={{ text: `${k.openedLast30} opened in 30 days`, tone: "flat" }} />
        <KpiCard label="On leave / WFH today" value={k.out.leave + k.out.wfh} sub={`${k.out.leave} leave · ${k.out.wfh} WFH`} trend={deltaTrend(k.outDelta, "vs last week", false)} />
        <KpiCard label="Attrition (12 months)" value={`${k.attrition}%`} trend={{ text: `${k.leavers} leaver${k.leavers === 1 ? "" : "s"} in 12 months`, tone: "flat" }} />
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="SOP Library" description="Sorted by last updated" className="lg:col-span-2">
          <SopPanel sops={sops} />
        </Panel>
        <Panel title="Coming up"><EventsPanel events={events} limit={6} /></Panel>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Out this week"><OutThisWeekPanel absences={week} days={days} /></Panel>
        <Panel title="New joiners"><NewJoinersPanel joiners={joiners} today={today} /></Panel>
        <Panel title="Pending approvals" className="md:col-span-2 xl:col-span-1" action={<Badge className="bg-amber-100 text-amber-800">{pending.length} open</Badge>}>
          <ApprovalsPanel requests={pending} />
        </Panel>
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Headcount trend" description="Active employees at each month-end, last 12 months">
          <HeadcountChart data={trend} />
        </Panel>
        <Panel title="Headcount by department">
          <DepartmentPie data={depts} />
        </Panel>
      </section>
    </div>
  );
}

async function StaffView({ filter }: { filter: Filter }) {
  const today = todayISO();
  const days = workWeek(today);
  const from = today < days[0] ? today : days[0];
  const to = today > days[4] ? today : days[4];
  const me = await currentEmployee();
  const [leave, absences, sops, events, news] = await Promise.all([
    getLeaveBalance(me.id), getAbsences(filter, from, to), getSops(filter), getEvents(filter), getAnnouncements(filter),
  ]);
  const mySops = sops.filter((s) => s.department_id === me.department_id || s.brand_id === null);
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title={`Good day, ${me.full_name.split(" ")[0]}`} subtitle={`${me.title} · ${DEPARTMENT_NAME[me.department_id]} · ${OFFICE_NAME[me.office_id]} · ${fmtDate(today, { weekday: "long", day: "numeric", month: "long" })}`} />
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="My leave balance" description={`${today.slice(0, 4)} entitlement`}>
          <LeaveBalancePanel {...leave} />
        </Panel>
        <Panel title="Who's out" description={`Today and this week · ${scopeLabel(filter)}`} className="lg:col-span-2">
          <WhosOutPanel absences={absences} days={days} today={today} />
        </Panel>
      </section>
      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="My SOPs" description={`${DEPARTMENT_NAME[me.department_id]} and group-wide procedures`} className="lg:col-span-2">
          <SopPanel sops={mySops} />
        </Panel>
        <div className="flex flex-col gap-4">
          <Panel title="Announcements"><AnnouncementsPanel items={news} /></Panel>
          <Panel title="Upcoming events"><EventsPanel events={events} limit={5} /></Panel>
        </div>
      </section>
    </div>
  );
}
