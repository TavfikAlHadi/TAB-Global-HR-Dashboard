# TAB Global HR Dashboard

Internal HR dashboard for TAB Global (Phase 2: Microsoft 365 sign-in, real staff list, demo leave/events). Next.js 16 App Router + Supabase.
Page-by-page reference: [docs/UI-PAGE-GUIDE.md](docs/UI-PAGE-GUIDE.md). Module requirements, UX flows and Supabase design: [docs/modules/](docs/modules/README.md).

## Setup

1. Install: `npm install`
2. Create a Supabase project, then run the migrations in order in the SQL editor (or `supabase db push`):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_service_role_grants.sql`
   - `supabase/migrations/0003_auth_rls.sql` (not re-runnable: create policy/index; run once)
3. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY` (seed only)
   (Supabase → Project Settings → API). Never commit `.env.local`; the service-role key bypasses RLS.
   `npm run build` needs non-empty `SUPABASE_URL` and `SUPABASE_ANON_KEY` (dummy values are fine for a local build check).
4. Microsoft sign-in:
   1. Entra ID → App registrations → New: redirect URI (Web) `https://<project>.supabase.co/auth/v1/callback`. Create a client secret.
   2. Entra → Token configuration → add optional claims `email` and `xms_edov` to the ID token (Supabase needs a verified email).
   3. Supabase → Authentication → Providers → Azure: client ID, secret, tenant URL `https://login.microsoftonline.com/<tenant-id>`.
   4. Supabase → Authentication → URL Configuration: add `http://localhost:3000/auth/callback` and `https://<netlify-site>/auth/callback` to Redirect URLs.
   5. Supabase → Authentication → Providers: disable Email (and every provider except Azure). Identity is only accepted from Azure logins.
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

- **Sign-in:** Microsoft 365 only; a login is matched by email to an active `employees` row, else `/no-access`.
- **Roles:** from `employees.role`; to try another role, edit your row's `role` in the Supabase table editor.
- **Data access:** server-only via `lib/data.ts`, every query runs as the signed-in user under RLS.

## Deploy

Netlify (`netlify.toml`). Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the site's environment variables. Remove `DEMO_PASSWORD` and `SUPABASE_SERVICE_ROLE_KEY` from Netlify.
