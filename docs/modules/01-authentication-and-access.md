# 1. Authentication & Access

**Phase 2 · Live** · Routes: `/login`, `/auth/callback`, `/no-access` · Code: [proxy.ts](../../proxy.ts), [app/actions.ts](../../app/actions.ts), [lib/role.ts](../../lib/role.ts), [0003_auth_rls.sql](../../supabase/migrations/0003_auth_rls.sql)

## Purpose

Every employee signs in with their own identity. What they can see and do is decided by their `employees` row and enforced in Postgres, not just hidden in the UI.

## Context

- TAB Global staff all have Microsoft 365 accounts, so Microsoft (Entra ID) single sign-on means no new password to remember and leavers lose access when IT disables their M365 account.
- HR owns the list of who works here (`employees`). Access follows that list: no row, or an `exit_date` in the past, means no access — even with a valid Microsoft login.
- Phase 1 used a shared demo password and a "View as" role switcher. Both are removed.

## Requirements

| # | Requirement | Status |
|---|---|---|
| A1 | Sign in with Microsoft 365 via Supabase Auth, Azure provider | Done |
| A2 | Match login to employee by email, case-insensitive (`lower(email)` unique index) | Done |
| A3 | Only logins whose provider is `azure` are trusted for matching | Done |
| A4 | Leavers (`exit_date < today`) are refused, even mid-session on next request | Done |
| A5 | Signed-out requests redirect to `/login`; session refreshed on every request | Done |
| A6 | Login without matching employee → `/no-access` showing the email used | Done |
| A7 | Role = `employees.role`; RLS policies on every table | Done |
| A8 | Sign out from the top bar on every page, including mobile | Done |
| A9 | Auth responses never CDN-cached (`Cache-Control: private, no-store`) | Done |
| A10 | Non-M365 users (contractors) can sign in | Open — see below |

## User experience flow

### First sign-in (happy path)

```
Open dashboard URL
  └─► proxy.ts: no session ─► redirect /login
        └─► "Sign in with Microsoft" ─► Microsoft login (or silent if already signed in to M365)
              └─► /auth/callback?code=… ─► exchange code for session cookie
                    └─► /  ─► currentEmployee(): email matches active employee
                          ├─ role = employee ─► Staff view
                          └─ role ≥ manager  ─► HR overview
```

1. User opens the link (bookmark, Teams tab, email).
2. Sees a centred TAB-branded card: logo, one sentence, **Sign in with Microsoft**.
3. Microsoft handles credentials and MFA. On a work laptop this is usually one click.
4. Lands on the dashboard; the greeting uses their first name, so they know it's their account.

### Not on the employee list

1. Microsoft sign-in succeeds, but no active `employees` row matches the email.
2. `/no-access`: "Your Microsoft account (*name@tab.global*) isn't linked to an active employee record. Ask HR to add you." + **Sign out**.
3. HR adds or fixes the row (Phase 3: Admin → Users); the user signs in again.

### Sign-in fails

Callback error (cancelled consent, expired code) → `/login?error=signin` with a short message and the same button. No technical detail shown.

### Leaving the company

HR sets `exit_date`. From that date `current_employee_id()` returns null; the next page load sends the user to `/no-access`. IT disabling the M365 account stops new sign-ins too.

### Sign out

Top-bar **Sign out** → Supabase session ended → `/login`.

## Supabase setup

### Auth

| Setting | Value |
|---|---|
| Provider | Azure, tenant URL `https://login.microsoftonline.com/<tenant-id>` |
| Entra app | Redirect URI `https://<project>.supabase.co/auth/v1/callback`; optional ID-token claims `email`, `xms_edov` |
| Redirect URLs | `http://localhost:3000/auth/callback`, `https://<netlify-site>/auth/callback` |
| Other providers | Disabled, including Email |
| Scopes | `email` |

Step-by-step in the [README](../../README.md#setup).

### Database

No users table of our own; `auth.users` belongs to Supabase. The link is the email, resolved in one SQL function:

```sql
current_employee_id()  -- employee id for this JWT's email, provider = azure, not exited; else null
is_hr()                -- current employee is hr_admin or super_admin
manages(emp uuid)      -- current employee is emp's direct manager
```

All three are `security definer` (so policies can read `employees` without recursing) and executable only by `authenticated`. Every RLS policy is written in terms of these.

Current read policies:

| Table | Who can read |
|---|---|
| offices, brands, departments, employees, sops, events, announcements, job_openings | Any active employee |
| absences | Approved: everyone. Pending: self, their manager, HR |
| leave_balances | Self, their manager, HR |

Write policies are added per module (Phases 3–5), each listed in that module's spec.

### Verification

`supabase/checks/rls.sql` impersonates an employee, an unknown email and HR inside a rolled-back transaction and must print `RLS check passed`. Run after every migration that touches policies.

## Open question: non-M365 users (A10)

The original brainstorm included email/password for people without M365. Phase 2 shipped Azure-only to keep one trusted identity source. If needed later:

- Enable Supabase **Email** provider with **sign-ups disabled**; HR invites users (`auth.admin.inviteUserByEmail`, server-side, HR only).
- Extend `current_employee_id()` to accept `provider = 'email'` **only when the email is confirmed** (`auth.jwt() ->> 'email_verified'`), otherwise anyone could register a staff address.
- Require MFA (Supabase TOTP) for these accounts.

Until then: contractors are not given access.

## Out of scope

- Role preview / impersonation for admins.
- Per-permission roles (four fixed roles only).
- SCIM sync from Entra (HR maintains `employees`; revisit if headcount grows a lot).
