# 2. Dashboard

**Phase 1 · Live** · Route: `/` · Code: [app/(dashboard)/page.tsx](../../app/(dashboard)/page.tsx), [lib/data.ts](../../lib/data.ts), [lib/metrics.ts](../../lib/metrics.ts)

## Purpose

The landing page after sign-in. One screen that answers "what do I need to know today?" — different for staff and for people who run the business.

## Context

- There is no clock-in system, so "attendance" means *who is on leave or working from home*, derived from `absences`. The original "Attendance Today" KPI was replaced by **On leave / WFH today**.
- Leaders currently pull headcount from spreadsheets each month. The dashboard derives headcount from `hire_date` / `exit_date`, so history is always available without snapshot tables.
- Office and brand are the two ways the business slices itself; every figure respects both filters.

## Requirements

| # | Requirement | Status |
|---|---|---|
| D1 | Role picks the view: Employee → Staff view, Manager/HR Admin/Super Admin → HR overview | Done |
| D2 | Office + brand filter in URL, applied to every panel | Done |
| D3 | KPI cards with trend vs a prior point (total, open positions, out today, attrition) | Done |
| D4 | Headcount trend: 12 month-ends, filterable | Done |
| D5 | Headcount by department | Done |
| D6 | Pending approvals (Manager: direct reports only, via RLS) | Done (actions stubbed until Phase 4) |
| D7 | Out this week, new joiners, upcoming events, SOP panel with stale flag | Done |
| D8 | Staff view: my leave balance + pending, who's out, my SOPs, announcements, events | Done |
| D9 | Quick actions (Add Employee, Post Job, Approve Leave, New SOP) open the real flow | Phase 3–5; toasts today |
| D10 | Rendered per request; "today" = Singapore date | Done |

Panel-level detail (layout, KPI formulas, empty states) is in [UI-PAGE-GUIDE §4.1](../UI-PAGE-GUIDE.md#41-dashboard--).

## User experience flows

### Employee — morning check

1. Signs in → **Good day, *first name*** with title · department · office · date.
2. **My leave**: sees annual days left at a glance; pending requests listed underneath.
3. **Who's out**: Mon–Fri strip shows how many colleagues are away each day; today's list below. Useful before booking a meeting.
4. **My SOPs**: their department's procedures plus group-wide ones; types to search, clicks the link icon to open the SharePoint document.
5. Glances at **Announcements** and **Upcoming events**.
6. Phase 4: clicks **Request leave** from the leave panel → the leave form ([04](04-leave-and-attendance.md)).

### Manager — start of week

1. Signs in → **HR overview** scoped to all offices.
2. Picks their office in the top bar; every number re-scopes, the URL updates (shareable with their head of department).
3. **Pending approvals** shows their direct reports' requests. Phase 4: Approve / Decline inline, toast confirms, panel refreshes.
4. **Out this week** to plan cover; **New joiners** to check onboarding.

### HR Admin — monthly review

1. Opens HR overview, all offices.
2. Reads KPI trends: headcount vs 30 days ago, attrition over 12 months, people out vs last week.
3. Switches brand filter to compare brands; copies the URL into the monthly report.
4. **SOP Library** panel → clicks "*n* stale" to list SOPs not updated in 90+ days; follows up with owners (Phase 5: edits directly).
5. Uses quick actions to jump into Add Employee / Post Job / New SOP (Phases 3–6).

## Supabase

No tables of its own. Reads only, all through `lib/data.ts` as the signed-in user:

| Panel | Function | Tables |
|---|---|---|
| KPIs | `getKpis` | employees, absences, job_openings |
| Headcount trend / by department | `getHeadcountTrend`, `getDepartmentSplit` | employees |
| Pending approvals, out this week, who's out | `getAbsences` | absences, employees |
| New joiners | `getNewJoiners` | employees |
| SOPs | `getSops` | sops, employees |
| Events | `getEvents` | events, sops |
| Announcements | `getAnnouncements` | announcements |
| My leave | `getLeaveBalance` | leave_balances, absences |

RLS shapes the result per user without any role branching in queries: a manager's pending list contains only direct reports because the `absences` policy filters the rest out.

**Scale note:** metrics are computed in TypeScript over the filtered employee list (~150 rows). Fine to a few thousand employees; beyond that move counts into SQL views. `// ponytail` comments in `lib/metrics.ts` mark the spots.

## Out of scope

- Custom/draggable widgets, saved dashboards.
- Payroll, performance or compensation data.
- Email digests of the dashboard (revisit after Phase 5).
