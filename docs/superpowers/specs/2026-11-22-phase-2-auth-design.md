# Phase 2 — Real login (Microsoft 365 SSO + RLS)

Date: 2026-11-22 · Status: approved design, pending implementation plan

## Goal

Replace the Phase 1 demo access (shared `DEMO_PASSWORD` + "View as" role cookie) with real sign-in.
Staff sign in with their Microsoft 365 work account; their role and data access come from their
`employees` row and are enforced by Postgres row-level security (RLS).

## Out of scope

- Any write paths (leave approvals, employee editing, SOP editing) — Phase 4/5. Phase 2 adds no
  insert/update/delete policies.
- Settings / user management UI — Phase 3. Access is managed by editing the `employees` table.
- Role preview for admins. The demo switcher is removed, not restricted.

## Decisions

| Topic | Decision |
|---|---|
| Sign-in | Supabase Auth, Azure (Microsoft Entra) OAuth provider |
| Identity match | Auth JWT `email` (lower-cased) = `employees.email` (lower-cased). No link column |
| Who gets in | Matching employee with `exit_date` null or in the future. Otherwise "no access" page |
| Role | `employees.role` of the matched row |
| Enforcement | RLS on every table, queried through a per-request client bound to the user's session |
| Demo mode | Removed (`DEMO_PASSWORD`, `demo_role` cookie, `setRole`, `RoleSwitcher`, `DEMO_EMPLOYEE_EMAIL`) |

## Architecture

### Request flow

1. `proxy.ts` (Next 16 proxy, replaces Basic auth) runs on every non-static request:
   - creates a Supabase server client from request cookies (`@supabase/ssr`) and calls
     `auth.getUser()`, which refreshes an expiring session and writes updated cookies to the response;
   - no user and path not in `/login`, `/auth/callback` → redirect to `/login`.
2. `/login` — public page, TAB branding, one "Sign in with Microsoft" button. Server action calls
   `signInWithOAuth({ provider: "azure", options: { scopes: "email", redirectTo: <origin>/auth/callback } })`
   and redirects to the returned URL. Shows an error message if `?error=` is present.
3. `/auth/callback` — route handler: `exchangeCodeForSession(code)`, then redirect to `/`.
   Failure → `/login?error=signin`.
4. Dashboard layout resolves the signed-in employee (see below). No match → redirect to `/no-access`.
5. `/no-access` — public-to-signed-in page: "Your Microsoft account (<email>) isn't linked to an active
   employee record. Ask HR to add you." plus a Sign out button.
6. Sign out — server action `auth.signOut()` → redirect to `/login`. Button in the top bar,
   where the "View as" switcher was (visible on mobile too).

### Server modules

- `lib/supabase.ts` — `db()` becomes a per-request server client (`createServerClient` from
  `@supabase/ssr`, anon key, cookies from `next/headers`), wrapped in React `cache()` so one client per
  request. Signature unchanged, so `lib/data.ts` callers are unaffected.
- `lib/role.ts` — `currentEmployee()` (cached): calls SQL `current_employee_id()` via RPC (matching
  rules live only in SQL), then selects `id, full_name, title, office_id, department_id, role`.
  No match → `redirect("/no-access")`. `currentRole()` returns its `role`.
  `canViewAll` / `canEditSops` unchanged (UI gating stays; RLS is the backstop).
- `lib/data.ts` — `getDemoEmployee()` removed; the Employee view uses `currentEmployee()`.

### Environment

| Var | Used by | Notes |
|---|---|---|
| `SUPABASE_URL` | app, seed | unchanged |
| `SUPABASE_ANON_KEY` | app | new; public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | seed only | app no longer uses it |
| `SEED_ADMIN_EMAIL` | seed only | optional; see Seeding |
| `DEMO_PASSWORD` | — | removed |

Supabase dashboard config (manual, documented in README): enable Azure provider with Entra app
client ID, secret and tenant URL; add `<site>/auth/callback` and `http://localhost:3000/auth/callback`
to redirect URLs. Entra app redirect URI = Supabase's `/auth/v1/callback`.

## Database — `supabase/migrations/0003_auth_rls.sql`

Helpers (`security definer`, `stable`, `search_path = public`), so policies don't recurse into
`employees` RLS:

- `current_employee_id() returns uuid` — id of employee whose lower(email) =
  lower(`auth.jwt() ->> 'email'`) and `exit_date is null or exit_date >= current_date`, else null.
- `is_hr() returns boolean` — current employee's role in (`hr_admin`, `super_admin`).
- `manages(emp uuid) returns boolean` — `emp`'s `manager_id` = current employee.

Grants: `usage` on schema and `select` on all tables to `authenticated`. `anon` gets nothing.
Execute on the helpers to `authenticated`.

Select policies (all `to authenticated`):

| Table | Rule |
|---|---|
| offices, brands, departments, sops, events, announcements, job_openings, employees | `current_employee_id() is not null` |
| absences | signed-in employee AND (`status = 'approved'` OR own OR employee's `manager_id` = me OR `is_hr()`) |
| leave_balances | own OR employee's `manager_id` = me OR `is_hr()` |

Rationale: the directory and "who's out" are company-wide information; pending requests and leave
balances are personal. A signed-in user with no employee match reads nothing.

## Seeding

`scripts/seed.ts` keeps the service-role key. If `SEED_ADMIN_EMAIL` is set, the seeded super_admin
(Grace Liu) gets that email, so the developer can sign in against demo data. To test other roles,
change that row's `role` in the Supabase table editor. `DEMO_EMPLOYEE_EMAIL` and its special-casing
are removed.

## Error handling

- OAuth/exchange failure → `/login?error=signin` with a readable message.
- Signed in, no active employee match → `/no-access` (never a blank or crashing dashboard).
- Expired/invalid session → proxy redirects to `/login`.
- Missing env vars → `db()` throws the existing clear "not set" error.
- `data.ts` `check()` already surfaces query errors; an RLS denial returns empty rows, not an error.

## Testing

- Matching and access rules live in SQL, so the runnable check is `supabase/checks/rls.sql`: run in the
  SQL editor, it impersonates an employee, an unknown email and HR inside a rolled-back transaction
  and `assert`s what each can read. Existing `npm test` must still pass.
- Manual, documented in the plan:
  1. Signed out → any route redirects to `/login`.
  2. Sign in with `SEED_ADMIN_EMAIL` → dashboard as Super Admin.
  3. Set role to `employee` → Employee view shows own balance; directory nav hidden.
  4. `supabase/checks/rls.sql` completes without assertion errors.
  5. Unknown Microsoft account → `/no-access`.
  6. Sign out → back to `/login`.
- `npm run build` and `npm run lint` pass.

## Docs to update

README (setup, env, demo behaviour, deploy), `docs/UI-PAGE-GUIDE.md` (top bar, role section,
footer text, new `/login` and `/no-access` pages), `.env.example`, code comments that say "Phase 2".
