# TAB Global HR Dashboard

Internal HR dashboard for TAB Global (Phase 1 prototype, demo data). Next.js 16 App Router + Supabase.
Page-by-page reference: [docs/UI-PAGE-GUIDE.md](docs/UI-PAGE-GUIDE.md).

## Setup

1. Install: `npm install`
2. Create a Supabase project, then run the migrations in order in the SQL editor (or `supabase db push`):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_service_role_grants.sql`
3. Copy `.env.example` to `.env.local` and fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   (Supabase → Project Settings → API). Never commit `.env.local`; the service-role key bypasses RLS.
4. Seed demo data: `npm run seed`. It wipes and re-inserts everything, with dates relative to today,
   so rerun it to refresh the demo.
5. Run: `npm run dev` → http://localhost:3000

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (`lib/*.test.ts`, Node test runner via tsx) |
| `npm run seed` | Reset Supabase to the demo dataset |

## Demo behaviour

- **Roles:** the "View as" switcher in the top bar sets a `demo_role` cookie (default HR Admin). Real login is Phase 2.
- **Password:** set `DEMO_PASSWORD` to put the site behind HTTP Basic auth (any username). Leave it empty locally.
- **Data access:** server-only, via `lib/data.ts`. The browser never talks to Supabase.

## Deploy

Netlify (`netlify.toml`). Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and `DEMO_PASSWORD` in the site's environment variables.
