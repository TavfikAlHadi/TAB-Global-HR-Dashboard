# TAB Global HR Dashboard

Internal HR dashboard for TAB Global (Phase 2: email + password sign-in for now, Microsoft 365 later; real staff list, demo leave/events). Next.js 16 App Router + Supabase.
Page-by-page reference: [docs/UI-PAGE-GUIDE.md](docs/UI-PAGE-GUIDE.md). Module requirements, UX flows and Supabase design: [docs/modules/](docs/modules/README.md).

## Setup

1. Install: `npm install`
2. Create a Supabase project, then run the migrations in order in the SQL editor (or `supabase db push`):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_service_role_grants.sql`
   - `supabase/migrations/0003_auth_rls.sql` (not re-runnable: create policy/index; run once)
   - `supabase/migrations/0004_email_sign_in.sql`
   - `supabase/migrations/0005_social_posts.sql` (run once; the overview needs this table)
3. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (seed only)
   (Supabase → Project Settings → API). Never commit `.env.local`; the service-role key bypasses RLS.
4. Sign-in (email + password for now):
   1. Supabase → Authentication → Sign In / Providers: **Email** on, **Allow new users to sign up** off, **Confirm email** on.
      Leave sign-ups off: a confirmed address is the only proof a login belongs to that employee.
   2. Supabase → Authentication → Users → **Add user → Create new user** for each person: their work email
      (must equal `employees.email`), a password, **Auto Confirm User** ticked. Share the password with them directly.
   3. Microsoft 365 later: Entra app registration with redirect URI `https://<project>.supabase.co/auth/v1/callback`,
      optional ID-token claims `email` and `xms_edov`; Supabase Azure provider with tenant URL
      `https://login.microsoftonline.com/<tenant-id>`; add `<site>/auth/callback` to Redirect URLs; restore the
      Microsoft button (`signInWithOAuth({ provider: "azure" })`, see git history of `app/actions.ts`). Azure logins
      are already accepted by `current_employee_id()`.
5. Put the staff list at `data/staff.csv` (gitignored: real names, never commit; columns
   `full_name,email,title,office_id,department_id,brand_id,role,hire_date`, optional `manager_email`;
   without it each person reports to their department's first `manager`). Seed: `npm run seed`;
   it validates the whole sheet first and stops, listing every bad line, before touching the database.
   It wipes and re-inserts everything; leave, WFH, events and announcements are still demo data
   with dates relative to today, so rerun it to refresh. Then run `supabase/checks/rls.sql` in the SQL editor; expect `RLS check passed`.
6. Run: `npm run dev` → http://localhost:3000

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (`lib/*.test.ts`, Node test runner via tsx) |
| `npm run seed` | Reset Supabase to the demo dataset |

## Demo behaviour

- **Sign-in:** email + password (users created in Supabase, sign-ups off); a confirmed login is matched by email to an active `employees` row, else `/no-access`.
- **Roles:** from `employees.role`; to try another role, edit your row's `role` in the Supabase table editor.
- **Data access:** server-only via `lib/data.ts`, every query runs as the signed-in user under RLS.

## Deploy

Netlify (`netlify.toml`). Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the site's environment variables. Remove `DEMO_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` from Netlify.
