# 9. Recruitment

**Phase 6 · Not scoped** · Route: `/recruitment` · Data today: `job_openings` (feeds the Open positions KPI)

## Purpose

Track open roles from approval to hire, so leadership sees hiring demand per office/brand and HR has one list instead of a spreadsheet. A first, light version — not a full applicant tracking system.

## Context

- Only `job_openings` exists (title, department, office, brand, status `open|closed`, `opened_at`). It drives the **Open positions** KPI (9 in demo data) and "*n* opened in 30 days".
- The **Post Job** quick action is reserved but does nothing yet.
- Candidates and CVs are personal data. Storing them raises retention and consent obligations (PDPA in Singapore/Malaysia, PIPL in China, UAE PDPL, Philippines DPA). That is why candidate tracking is a deliberate later decision, not assumed.
- Recruitment requirements were **not** covered in the brainstorm. The items below are a proposal to confirm with HR before building.

## Proposed requirements (to confirm)

| # | Requirement | Tier |
|---|---|---|
| R1 | Openings list: title, department, office, brand, hiring manager, status, days open | Light |
| R2 | HR Admin posts an opening (Post Job), edits, closes with reason (filled / cancelled) | Light |
| R3 | Manager requests a new role → HR approves → becomes open | Light |
| R4 | Close as *filled* links the opening to the new `employees` row | Light |
| R5 | Dashboard: time-to-fill and openings by department | Light |
| R6 | Candidates per opening with pipeline stages (applied → screen → interview → offer → hired / rejected) | Full ATS — needs privacy decision |
| R7 | CV storage, interview feedback | Full ATS — likely use a dedicated tool instead |

Recommendation: build **Light** only; if R6/R7 are needed, integrate a recruiting tool rather than store candidate data here.

## User experience flows (Light tier)

### Request a role (Manager)

1. **Recruitment → Request role**.
2. Form: title, department, office, brand, reason (new / replacement for *employee*), target start.
3. **Submit** → status *Requested*; HR Admins see it in a "To review" list.

### Approve and open (HR Admin)

1. **Recruitment → To review** → opens request → **Approve** (status *Open*, `opened_at` = today) or **Decline** with reason.
2. Open positions KPI goes up immediately.

### Post directly (HR Admin)

Top bar **Post Job** → same form, saved straight as *Open*.

### Fill (HR Admin)

1. After adding the hire in **Employees** ([03](03-employees.md)), opens the role → **Close as filled** → picks the new employee.
2. Time-to-fill recorded; KPI goes down.

## Supabase (Light tier, `0010_recruitment.sql`)

```sql
alter table job_openings
  drop constraint job_openings_status_check,
  add  constraint job_openings_status_check
       check (status in ('requested', 'open', 'filled', 'cancelled', 'declined')),
  add column hiring_manager_id uuid references employees(id),
  add column requested_by      uuid references employees(id),
  add column reason            text,
  add column closed_at         date,
  add column filled_by_id      uuid references employees(id);

-- Managers may request; HR does everything else.
create policy "manager request opening" on job_openings for insert to authenticated
  with check (status = 'requested' and requested_by = current_employee_id()
              and exists (select 1 from employees where id = current_employee_id() and role <> 'employee'));
create policy "hr update openings" on job_openings for update to authenticated
  using (is_hr()) with check (is_hr());
create policy "hr insert openings" on job_openings for insert to authenticated with check (is_hr());
```

Open positions KPI keeps counting `status = 'open'` — no code change in `getKpis`. Requested/declined openings should be hidden from Employee role: replace the Phase 2 read policy with `status in ('open','filled') or role <> 'employee'`.

## Out of scope (until confirmed)

- Candidate data, CVs, interview scheduling (R6–R7).
- Publishing jobs to careers site / LinkedIn.
- Offer letters.
