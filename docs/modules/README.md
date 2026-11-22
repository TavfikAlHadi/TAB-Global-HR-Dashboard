# TAB Global HR Dashboard — Module Specs

Requirements, context and user-experience flows for every module, one file each. Source: the agreed brainstorm plan (Phase 1 design) plus decisions made since (Phase 2 auth). For what each screen looks like *today*, see [UI-PAGE-GUIDE.md](../UI-PAGE-GUIDE.md).

## Product in one paragraph

TAB Global runs five offices (Singapore, Beijing, Dubai, Kuala Lumpur, Manila) and seven brands (The Asian Banker, TABInsights, Wealth & Society, RadioFinance, BankQuality, The Banking Academy, The Skill Store). HR and admin knowledge is scattered across spreadsheets, email and SharePoint. The dashboard gives every employee one place to see their leave, who is out, the SOPs that apply to them, upcoming events and announcements — and gives managers and HR a live view of headcount, absence and process health. Tone: executive, clean, no hype.

## Modules

| # | Module | Route | Phase | Status | Spec |
|---|---|---|---|---|---|
| 1 | Authentication & Access | `/login`, `/auth/callback`, `/no-access` | 2 | Live | [01-authentication-and-access.md](01-authentication-and-access.md) |
| 2 | Dashboard | `/` | 1 | Live | [02-dashboard.md](02-dashboard.md) |
| 3 | Employees | `/employees` | 4 | Read-only live | [03-employees.md](03-employees.md) |
| 4 | Leave & Attendance | `/whos-out` | 4 | Read-only live | [04-leave-and-attendance.md](04-leave-and-attendance.md) |
| 5 | Admin & Settings | `/settings` | 3 | Placeholder | [05-admin-and-settings.md](05-admin-and-settings.md) |
| 6 | SOP Library | `/sops` | 5 | Placeholder | [06-sop-library.md](06-sop-library.md) |
| 7 | Events & Forums | `/events` | 5 | Placeholder | [07-events-and-forums.md](07-events-and-forums.md) |
| 8 | Announcements | `/announcements` | 5 | Placeholder | [08-announcements.md](08-announcements.md) |
| 9 | Recruitment | `/recruitment` | 6 | Not scoped | [09-recruitment.md](09-recruitment.md) |

## Roles (fixed, four)

| Role | Sees | Can change |
|---|---|---|
| Employee | Own profile, own leave, who's out (approved only), directory, SOPs, events, announcements | Own leave requests (Phase 4) |
| Manager | Everything above + HR overview, direct reports' pending requests and balances | Approve/decline direct reports' leave (Phase 4) |
| HR Admin | Everything | Employees, all leave, SOPs, events, announcements |
| Super Admin | Everything | HR Admin rights + user roles and settings |

Management who need to edit SOPs are given HR Admin. Roles live in `employees.role`; there is no per-permission matrix.

## Supabase: how every module uses it

Supabase is the only backend: **Auth** for sign-in, **Postgres** for data, **row-level security (RLS)** for access control. There is no separate API server.

```
Browser ──► Next.js (Netlify)                         ──► Supabase
            proxy.ts      refresh session cookie          Auth  (Azure / Entra provider)
            page.tsx      server component                Postgres + RLS
            lib/data.ts   reads, as the signed-in user     helper SQL functions
            actions.ts    writes (server actions), same     current_employee_id()
                          user session                      is_hr(), manages(emp)
```

Conventions every module follows:

1. **One client, the user's session.** `lib/supabase.ts` `db()` is a per-request server client using the anon key and the user's cookies. Every query runs *as that user*, so RLS decides what comes back. The service-role key is used only by `scripts/seed.ts` and never reaches Netlify.
2. **Reads go through `lib/data.ts`.** UI never imports Supabase directly.
3. **Writes go through server actions** (`app/actions.ts` or a module's `actions.ts`), still using `db()`. Simple single-row writes use RLS `insert`/`update` policies. Multi-step writes (e.g. approve leave + deduct balance) use a `security definer` SQL function called with `db().rpc(...)`, so they are atomic and the permission check lives next to the data.
4. **Permissions live in SQL.** RLS policies and RPCs use the helpers from `0003_auth_rls.sql`: `current_employee_id()`, `is_hr()`, `manages(emp)`. Add `is_super_admin()` when Phase 3 needs it. `lib/role.ts` (`canViewAll`, `canEditSops`) only hides UI; it is never the sole check.
5. **Migrations are numbered SQL files** in `supabase/migrations/`, applied in order. Each module spec lists the migration it needs. `0003` granted `authenticated` only `select`, and only on tables that existed then. So every later migration must also `grant select` on new tables and `grant insert, update` (or `delete`) on any table that gets a write policy — a policy without the grant still fails with "permission denied". The SQL sketches in the module specs leave these grants out for brevity.
6. **Lookups are text ids** (`SG`, `tab`, `editorial`); records use `uuid` with `gen_random_uuid()`. Enumerations are `check` constraints, not Postgres enums (easier to extend).
7. **Dates are Singapore time.** `todayISO()` in `lib/data.ts` is the single definition of "today".
8. **Every write is audited** (from Phase 3) into `audit_log` — see [05-admin-and-settings.md](05-admin-and-settings.md).

Not used, on purpose: Supabase Realtime (pages are rendered per request; refresh is enough), Edge Functions (server actions cover it), Storage (documents stay in SharePoint). Add any of these only when a module needs it.

## Shared UX rules

- **Filters in the URL** (`?office=SG&brand=tab`), carried across modules, so any view is shareable.
- **Every action confirms with a toast** and the page re-renders with fresh data (`revalidatePath`).
- **Empty states say what's empty** ("Everyone is in today."), never a blank panel.
- **Mobile:** bottom tab bar with Home, People, Leave, SOPs; other modules desktop-first.
- **Brand:** Navy `#004EA8` primary, Red `#E4002B` for warnings/stale, Public Sans only.
