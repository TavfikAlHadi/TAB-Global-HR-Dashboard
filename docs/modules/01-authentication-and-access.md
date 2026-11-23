# 1. Authentication & Access

**Phase 2 · Live (email + password; Microsoft 365 later)** · Routes: `/login`, `/auth/callback`, `/no-access` · Code: [proxy.ts](../../proxy.ts), [app/actions.ts](../../app/actions.ts), [lib/role.ts](../../lib/role.ts), [0003_auth_rls.sql](../../supabase/migrations/0003_auth_rls.sql)

## Purpose

Every employee signs in with their own account. What they can see and do is decided by their `employees` row and enforced in Postgres, not just hidden in the UI.

## Context

- **Now: email + password.** Supabase Auth's Email provider with sign-ups disabled; HR/admin creates each user in Supabase with their work email. Chosen as an interim step so the dashboard can go live before the Microsoft (Entra ID) app registration is done.
- **Later: Microsoft 365.** Staff all have M365 accounts, so single sign-on removes the extra password and leavers lose access when IT disables their M365 account. The SQL already accepts Azure logins; only the button and provider setup are missing.
- HR owns the list of who works here (`employees`). Access follows that list: no row, or an `exit_date` in the past, means no access — even with a valid Microsoft login.
- Phase 1 used a shared demo password and a "View as" role switcher. Both are removed.

## Requirements

| # | Requirement | Status |
|---|---|---|
| A1 | Sign in with email + password via Supabase Auth; users created by an admin, sign-ups off | Done (interim) |
| A1b | Sign in with Microsoft 365 via Supabase Auth, Azure provider | Later |
| A2 | Match login to employee by email, case-insensitive (`lower(email)` unique index) | Done |
| A3 | Only `azure` logins, or `email` logins whose address Supabase has confirmed, are trusted for matching | Done |
| A4 | Leavers (`exit_date < today`) are refused, even mid-session on next request | Done |
| A5 | Signed-out requests redirect to `/login`; session refreshed on every request | Done |
| A6 | Login without matching employee → `/no-access` showing the email used | Done |
| A7 | Role = `employees.role`; RLS policies on every table | Done |
| A8 | Sign out from the top bar on every page, including mobile | Done |
| A9 | Auth responses never CDN-cached (`Cache-Control: private, no-store`) | Done |
| A10 | Non-M365 users (contractors) can sign in | Covered by email + password; keep after M365 if needed |

## User experience flow

### First sign-in (happy path)

```
Open dashboard URL
  └─► proxy.ts: no session ─► redirect /login
        └─► email + password ─► signInWithPassword (server action) ─► session cookie
              └─► /  ─► currentEmployee(): confirmed email matches active employee
                          ├─ role = employee ─► Staff view
                          └─ role ≥ manager  ─► HR overview
```

0. Admin creates the user in Supabase (Authentication → Users → Add user, work email, password, Auto Confirm) and shares the password with them directly.
1. User opens the link (bookmark, Teams tab, email).
2. Sees a centred TAB-branded card: logo, **Email**, **Password**, **Sign in**.
3. Lands on the dashboard; the greeting uses their first name, so they know it's their account.

With Microsoft 365 (later), step 2 becomes one **Sign in with Microsoft** button and the code returns via `/auth/callback`.

### Not on the employee list

1. Sign-in succeeds, but no active `employees` row matches the email.
2. `/no-access`: "Your Microsoft account (*name@tab.global*) isn't linked to an active employee record. Ask HR to add you." + **Sign out**.
3. HR adds or fixes the row (Phase 3: Admin → Users); the user signs in again.

### Sign-in fails

Wrong email or password → `/login?error=signin` with "Wrong email or password. Please try again." No detail about which one was wrong. (Microsoft later: callback errors land on the same message.)

### Leaving the company

HR sets `exit_date`. From that date `current_employee_id()` returns null; the next page load sends the user to `/no-access`. Also delete or ban the user in Supabase → Authentication → Users (with M365 later, IT disabling the account does this).

### Sign out

Top-bar **Sign out** → Supabase session ended → `/login`.

## Supabase setup

### Auth

Now:

| Setting | Value |
|---|---|
| Email provider | On |
| Allow new users to sign up | **Off** — users are created by an admin |
| Confirm email | On (admin-created users are ticked *Auto Confirm*) |
| Other providers | Off until Microsoft is set up |

Later (Microsoft 365):

| Setting | Value |
|---|---|
| Provider | Azure, tenant URL `https://login.microsoftonline.com/<tenant-id>` |
| Entra app | Redirect URI `https://<project>.supabase.co/auth/v1/callback`; optional ID-token claims `email`, `xms_edov` |
| Redirect URLs | `http://localhost:3000/auth/callback`, `https://<netlify-site>/auth/callback` (plus deploy previews) |
| Scopes | `email` |

Step-by-step in the [README](../../README.md#setup).

### Database

No users table of our own; `auth.users` belongs to Supabase. The link is the email, resolved in one SQL function:

```sql
current_employee_id()  -- employee id for this JWT's email, not exited, provider azure or confirmed email; else null
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

`supabase/checks/rls.sql` impersonates an employee, an unknown email, a leaver, HR, an unconfirmed and a confirmed email login, and another provider inside a rolled-back transaction and must print `RLS check passed`. Run after every migration that touches policies.

## Security notes for email + password

- **Sign-ups must stay off.** If they were on with *Confirm email* off, anyone could register a staff address and be matched. `current_employee_id()` requires `auth.users.email_confirmed_at` for email logins as a second guard (migration `0004_email_sign_in.sql`).
- Passwords are shared once by the admin; users can't reset their own until SMTP is configured in Supabase (default mailer is rate-limited). Acceptable for the interim; Microsoft sign-in removes the problem.
- Consider Supabase MFA (TOTP) if the interim lasts long.

## Out of scope

- Role preview / impersonation for admins.
- Self-service password reset (needs SMTP; Microsoft sign-in will replace passwords).
- Per-permission roles (four fixed roles only).
- SCIM sync from Entra (HR maintains `employees`; revisit if headcount grows a lot).
