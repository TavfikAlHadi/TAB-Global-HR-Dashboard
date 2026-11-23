# 3. Employees

**Phase 4 · Read-only live** · Route: `/employees` (+ `/employees/[id]`, `/employees/new` planned) · Code: [employees/page.tsx](../../app/(dashboard)/employees/page.tsx), [directory-table.tsx](../../components/directory-table.tsx)

## Purpose

The company directory and the HR system of record for who works here, where, in which role and under whom. Every other module hangs off `employees`: access (sign-in matching), leave, SOP ownership, approvals.

## Context

- 68 people (Oct 2026 directory) across 5 offices plus Remote, 7 brands, 8 departments. HR currently keeps this in spreadsheets.
- `employees.email` must equal the person's Microsoft 365 address — it is how sign-in finds them ([01](01-authentication-and-access.md)). A typo here means the person gets "no access".
- `manager_id` defines who approves whose leave. Wrong manager = requests go to the wrong person.
- Leavers are never deleted: `exit_date` keeps headcount history and attrition correct.

## Requirements

| # | Requirement | Phase | Status |
|---|---|---|---|
| E1 | Directory: search, department + status filters, office/brand from top bar, paging | 4 | Done |
| E2 | Derived status: Active, On leave, Probation (≤90 days), Starting soon, Notice period | 4 | Done |
| E3 | Status hidden from Employee role (stripped server-side) | 4 | Done |
| E4 | Export filtered rows as CSV (Manager+) | 4 | Done |
| E5 | Profile page: contact, role, office, brand, department, manager, direct reports, hire date | 4 | Planned |
| E6 | Employees can edit a small set of own fields (phone, preferred name) | 4 | Planned |
| E7 | HR Admin adds an employee (all fields), validates unique email | 4 | Planned |
| E8 | HR Admin edits job fields (title, office, brand, department, manager) | 4 | Planned |
| E9 | HR Admin records a leaver (`exit_date`); access ends that day | 4 | Planned |
| E10 | Role changes are Super Admin only, done in Admin ([05](05-admin-and-settings.md)) | 3 | Planned |
| E11 | New employee gets current-year leave balances from office policy | 4 | Planned |
| E12 | Every change written to `audit_log` | 4 | Planned |

## User experience flows

### Find a colleague (any employee)

1. Sidebar **Employees** (mobile: **People**).
2. Types a name or email; table filters instantly.
3. Clicks a row → profile (E5): title, office, department, manager, email (mailto) and Teams link.

### Add a new hire (HR Admin)

1. Top bar **Add Employee** or **Employees → New employee**.
2. Form, one column, grouped:
   - *Person*: full name, work email (must be the M365 address), title.
   - *Placement*: office, brand, department, manager (searchable select of active employees).
   - *Dates*: hire date (may be future).
3. Validation inline: email format, email not already used (case-insensitive), manager is active, hire date present.
4. **Save** → toast "*Name* added"; redirect to the profile. Status shows *Starting soon* if hire date is future.
5. Behind the scenes: leave balances for the current year are created from the office's entitlement policy, pro-rated by hire date ([05](05-admin-and-settings.md#leave-policy)).
6. On the hire date the person can sign in with Microsoft — nothing else to set up.

### Change a job detail (HR Admin)

1. Profile → **Edit**.
2. Changes manager (e.g. after a re-org) → **Save** → toast.
3. Future pending leave requests now route to the new manager automatically (RLS uses current `manager_id`).

### Record a leaver (HR Admin)

1. Profile → **Record exit** → date picker (defaults to today) + optional reason.
2. Confirm dialog: "*Name* will lose access on *date*. Their pending leave requests will be cancelled."
3. **Confirm** → status shows *Notice period* until the date, then the person disappears from the directory (kept in history and headcount).
4. If they manage people, a warning lists direct reports to reassign first.

### Update my own details (Employee)

Profile → **Edit my details** → phone / preferred name only → **Save**. Everything else is read-only with "Contact HR to change".

## Supabase

### Schema changes (`0004_employees_write.sql`)

```sql
alter table employees
  add column phone          text,
  add column preferred_name text,
  add column exit_reason    text;

-- Self-service is the only direct write: a column grant limits it to two fields, the policy to own row.
grant update (phone, preferred_name) on employees to authenticated;
create policy "self update contact" on employees for update to authenticated
  using (id = current_employee_id()) with check (id = current_employee_id());

-- All HR writes (insert, job fields, exit) go through security definer RPCs that check is_hr(),
-- because column grants apply to every authenticated user, HR included.
```

Role changes are blocked here; only `set_employee_role()` (Super Admin, [05](05-admin-and-settings.md)) may change `role`.

### Writes

| Action | Server action | Supabase call |
|---|---|---|
| Add employee | `createEmployee` | `rpc('hr_create_employee', …)` — insert row + current-year `leave_balances` + audit, one transaction |
| Edit job fields | `updateEmployee` | `rpc('hr_update_employee', …)` |
| Record exit | `recordExit` | `rpc('hr_record_exit', …)` — set `exit_date`, cancel future pending absences, audit |
| Edit own contact | `updateMyDetails` | `db().from('employees').update({phone, preferred_name}).eq('id', me)` |

Each RPC starts with `if not is_hr() then raise exception 'forbidden'`. Unique email is enforced by the existing `employees_email_lower_key` index; the action maps that error to "Email already in use".

### Reads

`getDirectory(filter)` (exists), add `getEmployee(id)` returning the profile plus direct reports.

## Out of scope

- Documents (contracts, IDs) — stay in HR's SharePoint.
- Compensation, bank details, performance reviews.
- Org chart visualisation (profile shows manager and direct reports; enough for now).
- Bulk import UI (seed script / SQL covers initial load).
