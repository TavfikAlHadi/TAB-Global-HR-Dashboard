# 5. Admin & Settings

**Phase 3 · Placeholder** · Route: `/settings` (tabs: Users · Organisation · Leave policy · Audit log) · Code: placeholder via `[section]/page.tsx`

## Purpose

Where Super Admins control who has which role, and where HR maintains the reference data other modules depend on: offices, brands, departments, public holidays and leave entitlements. Also the audit trail of every change.

## Context

- Today roles are changed by editing `employees.role` in the Supabase table editor. That needs database access and leaves no record of who changed what.
- Offices, brands and departments are hard-coded in [lib/constants.ts](../../lib/constants.ts) *and* seeded into lookup tables. Once HR can edit them, the tables become the source of truth and the constants become seed-only.
- Leave & Attendance ([04](04-leave-and-attendance.md)) needs per-office public holidays and entitlements to count working days and create balances.

## Requirements

| # | Requirement | Who | Status |
|---|---|---|---|
| S1 | Users tab: list employees with role, filter by role, search | Super Admin | Planned |
| S2 | Change an employee's role, with confirmation | Super Admin | Planned |
| S3 | Cannot remove the last Super Admin; cannot demote yourself | System | Planned |
| S4 | Organisation tab: add/rename offices, brands, departments; deactivate (not delete) if in use | HR Admin, Super Admin | Planned |
| S5 | Public holidays per office per year: add, remove, copy from last year | HR Admin, Super Admin | Planned |
| S6 | Leave policy per office: annual / sick / other days per year, pro-rate rule for joiners | HR Admin, Super Admin | Planned |
| S7 | Start new leave year: create next-year balances for everyone, with optional carry-over cap | HR Admin, Super Admin | Planned |
| S8 | Adjust one person's balance with a reason | HR Admin, Super Admin | Planned |
| S9 | Audit log: every write in every module — who, when, what, before/after | View: HR Admin, Super Admin | Planned |
| S10 | SOP stale threshold (default 90 days) configurable | Super Admin | Planned (optional) |
| S11 | Settings sidebar item hidden for Employee and Manager | System | Planned |

## User experience flows

### Promote someone to HR Admin (Super Admin)

1. **Settings → Users**.
2. Searches the name; row shows current role as a select.
3. Picks **HR Admin** → confirm dialog: "Give *Name* HR Admin? They will be able to edit employees, leave, SOPs, events and announcements."
4. **Confirm** → toast "*Name* is now HR Admin". Takes effect on their next page load (role is read per request).
5. Audit log records old and new role.

Trying to demote the last Super Admin or yourself shows the reason inline and disables **Confirm**.

### Prepare a new year's holidays (HR Admin)

1. **Settings → Leave policy → Public holidays**, picks office *Singapore* and year *2027*.
2. **Copy from 2026** → list pre-filled with last year's names, dates blank-highlighted for review.
3. Fixes dates, removes one, adds one → **Save**.
4. Toast; requests for 2027 now exclude these days automatically.

### Open the new leave year (HR Admin)

1. **Settings → Leave policy → Start 2027**.
2. Preview: number of employees, entitlements per office, carry-over cap (e.g. max 5 annual days).
3. **Create balances** → runs once; button then shows "2027 balances created on *date*".

### Fix a balance (HR Admin)

1. Employee profile or **Settings → Leave policy → Adjust balance**.
2. Picks person, type, +/− days, reason (required) → **Save** → toast; audit entry.

### Investigate a change (HR Admin)

**Settings → Audit log** → filter by person, table or date → each row expands to show before/after values.

## Supabase

### Schema (`0006_admin_settings.sql`)

```sql
alter table offices     add column active boolean not null default true;
alter table brands      add column active boolean not null default true;
alter table departments add column active boolean not null default true;

create table leave_policies (
  office_id  text not null references offices(id),
  leave_type text not null check (leave_type in ('annual', 'sick', 'other')),
  days       numeric(4,1) not null check (days >= 0),
  carry_over_max numeric(4,1) not null default 0,
  primary key (office_id, leave_type)
);

create table audit_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor_id   uuid references employees(id),
  action     text not null,          -- 'employee.update', 'absence.approve', 'role.change', …
  table_name text not null,
  row_id     text not null,
  before     jsonb,
  after      jsonb
);

create function is_super_admin() returns boolean language sql stable security definer
  set search_path = public as $$
  select exists (select 1 from employees where id = current_employee_id() and role = 'super_admin')
$$;
```

`public_holidays` is created in `0005` ([04](04-leave-and-attendance.md)).

### Access rules

| Table | Read | Write |
|---|---|---|
| offices, brands, departments | Active staff | `is_hr()` — insert/update policies; no delete (deactivate) |
| public_holidays, leave_policies | Active staff | `is_hr()` |
| leave_balances | Self, manager, HR (exists) | Only via RPCs below |
| audit_log | `is_hr()` | Nobody directly — only `security definer` functions insert |
| employees.role | — | Only `set_employee_role()` |

### RPCs

| RPC | Check | Does |
|---|---|---|
| `set_employee_role(emp, role)` | `is_super_admin()`, not self, not last super admin | Update role + audit |
| `start_leave_year(year)` | `is_hr()`, year not already started | Insert balances for all active employees from `leave_policies` + capped carry-over |
| `adjust_leave_balance(emp, year, type, delta, reason)` | `is_hr()` | Update `entitled` + audit with reason |

Audit helper used by every module's RPCs:

```sql
create function audit(p_action text, p_table text, p_row text, p_before jsonb, p_after jsonb)
returns void language sql security definer set search_path = public as $$
  insert into audit_log (actor_id, action, table_name, row_id, before, after)
  values (current_employee_id(), p_action, p_table, p_row, p_before, p_after)
$$;
revoke execute on function audit from public, anon, authenticated;  -- callable only from other definer functions
```

Simple RLS writes (lookups, holidays, policies) are audited with an `after insert or update` trigger that calls the same insert.

### App changes

- `lib/constants.ts` lookups become seed data only; filters and selects read the lookup tables (`getLookups()`, cached per request) so new offices appear without a deploy.
- `lib/role.ts` gains `canManageUsers = role === 'super_admin'`, `canEditSettings = canEditSops`.

## Out of scope

- Custom roles or permission matrices.
- Inviting users (sign-in is Microsoft; adding the employee row is enough).
- App-wide theme/branding settings.
