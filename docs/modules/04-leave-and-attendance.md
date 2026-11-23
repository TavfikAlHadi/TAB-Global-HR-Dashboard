# 4. Leave & Attendance

**Phase 4 · Read-only live** · Route: `/whos-out` · Code: [whos-out/page.tsx](../../app/(dashboard)/whos-out/page.tsx), [team-calendar.tsx](../../components/team-calendar.tsx), [lib/leave.ts](../../lib/leave.ts)

## Purpose

Request, approve and see time away: annual, sick and other leave, plus work-from-home days. Replaces email-and-spreadsheet leave tracking.

## Context

- No clock-in system. "Attendance" = who is in the office, on leave or WFH, derived from `absences`. In office = active headcount − leave − WFH.
- Approval chain is one level: the employee's direct manager (`manager_id`). HR can approve anyone's request (covers managers on leave and people without a manager).
- WFH is recorded so colleagues know who is remote; it does not consume a balance.
- Five offices = five public-holiday calendars and possibly different entitlements; both belong in Settings ([05](05-admin-and-settings.md)).
- Today the schema only has `pending | approved`, so Approve / Decline buttons are stubbed with a toast.

## Requirements

| # | Requirement | Phase | Status |
|---|---|---|---|
| L1 | This week: tiles (in office, WFH, on leave, pending), team calendar, leave requests list | 4 | Done (read) |
| L2 | Pending requests visible only to self, their manager and HR (RLS) | 2 | Done |
| L3 | Employee requests leave: type, start, end, half-day option, note | 4 | Planned |
| L4 | Employee logs WFH day(s) — auto-approved | 4 | Planned |
| L5 | Day count excludes weekends and the employee's office public holidays | 4 | Planned |
| L6 | Request blocked if annual balance would go negative; sick/other warn only | 4 | Planned |
| L7 | Overlap with an existing request blocked | 4 | Planned |
| L8 | Manager approves/declines direct reports; HR approves/declines anyone | 4 | Planned |
| L9 | Decline requires a short reason, shown to the employee | 4 | Planned |
| L10 | Approval deducts from `leave_balances.taken`; cancel of approved leave restores it | 4 | Planned |
| L11 | Employee cancels own pending request any time; approved future request → cancel restores balance | 4 | Planned |
| L12 | Nobody approves their own request | 4 | Planned |
| L13 | Navigate weeks (previous / next) and month view | 4 | Planned |
| L14 | Notification to approver on new request, to employee on decision (email) | 4 | Planned (Supabase-free: Microsoft Graph or SMTP via server action) |

## User experience flows

### Request leave (Employee)

1. Dashboard **My leave → Request leave**, or **Leave & Attendance → Request leave**.
2. Side sheet form:
   - Type: Annual · Sick · Other · Work from home (segmented control).
   - Dates: start and end (native date inputs), "Half day" checkbox when start = end.
   - Note (optional; required for Other).
3. Live summary under the form: "**3 working days** · 11 annual days left after this request." Public holidays in range are named ("excludes 25 Dec, Christmas").
4. Errors inline: end before start, overlaps an existing request, not enough annual balance.
5. **Submit** → toast "Request sent to *manager name*". Request appears as *Pending* (dashed) on the calendar and in My leave.
6. WFH: same form, submit → toast "WFH logged"; shows immediately for everyone, no approval.

### Approve or decline (Manager / HR)

1. Sees the count on the dashboard **Pending approvals** badge, or opens **Leave & Attendance → Leave requests**.
2. Each row: name, type, dates, working days, days left after, note, and who else in the team is out on those dates (clash hint).
3. **Approve** → toast "Approved — *name*, 3 days"; row leaves the list; calendar bar turns solid.
4. **Decline** → small inline field "Reason" (required) → **Decline** → toast. Employee sees *Declined* with the reason in My leave.

### Change of plans (Employee)

1. My leave → pending or future approved request → **Cancel request**.
2. Confirm: "Cancel annual leave 23–25 Dec? 3 days will be returned to your balance." (approved only).
3. Toast; calendar updates. Manager sees it disappear from their list.

### Who's out (anyone)

1. **Leave & Attendance**: today's tiles, then the team calendar for Mon–Fri (next week on weekends).
2. Office/brand filter in the top bar narrows to a team.
3. ‹ › to move week; toggle Week / Month (L13).

## Supabase

### Schema changes (`0005_leave_requests.sql`)

```sql
alter table absences
  drop constraint absences_status_check,
  add  constraint absences_status_check
       check (status in ('pending', 'approved', 'declined', 'cancelled')),
  add column half_day      boolean not null default false,
  add column days          numeric(4,1),                 -- working days, computed on submit
  add column note          text,
  add column decided_by    uuid references employees(id),
  add column decided_at    timestamptz,
  add column decline_reason text,
  add column created_at    timestamptz not null default now();

create table public_holidays (                           -- maintained in Settings
  office_id text not null references offices(id),
  day       date not null,
  name      text not null,
  primary key (office_id, day)
);
alter table public_holidays enable row level security;
create policy "active staff read" on public_holidays for select to authenticated
  using (current_employee_id() is not null);

-- Stop the same person being away twice on one day (pending or approved).
create extension if not exists btree_gist;
alter table absences add constraint absences_no_overlap exclude using gist (
  employee_id with =, daterange(start_date, end_date, '[]') with &&
) where (status in ('pending', 'approved'));
```

The demo seed currently lets a person have leave and WFH on the same day ("leave beats WFH"). Before adding `absences_no_overlap`, change `scripts/seed.ts` so one person's absences never overlap, or the migration fails on existing rows. The "leave beats WFH" display rule can then be removed.

### Writes — all via `security definer` RPCs

Table-level insert/update policies are not granted on `absences`; every change goes through a function so the balance and the status change together.

| RPC | Who | Does |
|---|---|---|
| `request_absence(kind, leave_type, start, end, half_day, note)` | Any active employee, for self | Computes working days (weekends + `public_holidays` for their office), checks overlap and annual balance, inserts `pending` (WFH: `approved`) |
| `decide_absence(id, approve bool, reason)` | `manages(employee_id) or is_hr()`, and not own request | Pending → approved (adds `days` to `leave_balances.taken`) or declined (reason required) |
| `cancel_absence(id)` | Owner (or HR) | Pending/approved future → cancelled; restores `taken` if it was approved |

```sql
-- shape of each RPC
create function decide_absence(p_id uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare a absences;
begin
  select * into a from absences where id = p_id for update;
  if a.status <> 'pending' then raise exception 'not pending'; end if;
  if a.employee_id = current_employee_id() then raise exception 'cannot decide own request'; end if;
  if not (manages(a.employee_id) or is_hr()) then raise exception 'forbidden'; end if;
  -- update status, decided_by/at, balance; insert audit_log
end $$;
```

Server actions in `app/(dashboard)/whos-out/actions.ts` call these with `db().rpc(...)`, map exceptions to friendly messages, then `revalidatePath('/whos-out')` and `revalidatePath('/')`.

### Reads

Existing `getAbsences(filter, from, to, status)` and `getLeaveLeft(ids)`. Add `getMyRequests()` (all statuses, own) and `getHolidays(office, from, to)`. `dayCount` in `lib/leave.ts` switches to reading the stored `days` column.

### Notifications (L14)

Server action sends after a successful RPC. Simplest: Microsoft Graph `sendMail` from a shared HR mailbox (same Entra app). Not Supabase; Supabase Auth emails are for auth only.

## Out of scope

- Multi-level approval chains, delegation rules.
- Accrual engines (balances are yearly entitlements; carry-over set manually by HR in Settings).
- Time sheets, overtime, clock-in.
- Calendar sync to Outlook (revisit after L14 is in).
