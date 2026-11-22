# TAB Global HR Dashboard — UI Page Guide

Reference for every page and module in the dashboard: what each screen shows, who sees it, where its data comes from, and which components build it. Reflects the **Phase 2 prototype** (Microsoft 365 sign-in): dashboard home, Employees directory and Leave & Attendance live (read-only, actions stubbed); other modules are placeholders.

---

## 1. App shell

Every page under `app/(dashboard)/` renders inside the same shell ([layout.tsx](../app/(dashboard)/layout.tsx)).

```
┌──────────────┬──────────────────────────────────────────────────────────┐
│  TAB logo    │  [Office ▾] [Brand ▾]        [Quick actions…] [Sign out] │  ← top bar
│──────────────│──────────────────────────────────────────────────────────│
│ Dashboard    │                                                          │
│ Employees    │                                                          │
│ Leave & Att. │                    Page content                          │
│ Recruitment  │                                                          │
│ SOP Library  │                                                          │
│ Events       │                                                          │
│ Announcements│                                                          │
│ Settings     │                                                          │
│              │                                                          │
│ Phase 2 · demo data                                                     │
└──────────────┴──────────────────────────────────────────────────────────┘
```

### 1.1 Sidebar — [sidebar.tsx](../components/sidebar.tsx)

| Item | Detail |
|---|---|
| Width | 240px (`w-60`), sticky full-height; below `md` (768px) replaced by a bottom tab bar using each item's `short` label (Home, People, Leave, SOPs) |
| Logo | `/public/logo.svg`, 132×44 |
| Items | Driven by `NAV` in [lib/nav.ts](../lib/nav.ts) — add a module there and it appears here |
| Active state | `bg-sidebar-accent` + `font-medium`, `aria-current="page"`. Dashboard matches `/` exactly; others match by prefix |
| Filter carry-over | Links keep the current query string, so office/brand filters persist across modules |
| Footer | Settings link, then "Phase 2 · demo data" |

### 1.2 Top bar — [topbar-controls.tsx](../components/topbar-controls.tsx)

| Control | Behaviour | Visible to |
|---|---|---|
| **Office filter** | Select: All offices, Singapore, Beijing, Dubai, Kuala Lumpur, Manila. Writes `?office=SG` etc. | Everyone |
| **Brand filter** | Select: All brands + 7 TAB brands. Writes `?brand=tab` etc. | Everyone |
| **Quick actions** | Add Employee, Post Job, Approve Leave, New SOP. Each currently shows a toast: "*X* arrives in Phase *N*." | Manager, HR Admin, Super Admin |
| ↳ New SOP | Shown only when the role can edit SOPs | HR Admin, Super Admin |
| **Sign out** | `signOut` server action; ends the Supabase session → `/login` | Everyone |

### 1.3 Global states

| State | Where | What renders |
|---|---|---|
| Loading | [loading.tsx](../app/(dashboard)/loading.tsx) | Pulsing skeleton: title bar, 4 KPI tiles, one large panel |
| Unknown route | `[section]/page.tsx` → [not-found.tsx](../app/(dashboard)/not-found.tsx) | `notFound()` → "Page not found" inside the shell with a link home. HTTP status stays 200 because the page streams (Next adds `noindex`) |
| Auth | [proxy.ts](../proxy.ts) | Refreshes the Supabase session and redirects signed-out requests to `/login` (except `/login`, `/auth/callback`) |
| Sign-in | [app/login/page.tsx](../app/login/page.tsx) | Centred card with a "Sign in with Microsoft" button; you land here when signed out or after Sign out. Failed callbacks return here with an error |
| No access | [app/no-access/page.tsx](../app/no-access/page.tsx) | Shown when the Microsoft login has no active `employees` row matching its email: displays the signed-in email and a Sign out button |
| Toasts | Root layout | Sonner, top-right, light theme |

---

## 2. Roles and visibility

Role comes from the signed-in user's `employees.role` (via `current_employee_id()`); RLS enforces data access. Rules live in [lib/role.ts](../lib/role.ts).

| Role | Dashboard view | Quick actions | New SOP |
|---|---|---|---|
| Employee | Staff view | — | — |
| Manager | HR overview | ✓ | — |
| HR Admin | HR overview | ✓ | ✓ |
| Super Admin | HR overview | ✓ | ✓ |

- `canViewAll(role)` → everyone except Employee
- `canEditSops(role)` → HR Admin, Super Admin

---

## 3. Filters

Shared by all modules through the URL: `?office=<id>&brand=<id>`. Values are whitelisted by `parseFilter` in [lib/data.ts](../lib/data.ts); anything unknown is ignored.

| Data | Office filter | Brand filter |
|---|---|---|
| Employees, KPIs, headcount, departments | ✓ | ✓ |
| Absences (Who's out) | ✓ (by employee) | ✓ (by employee) |
| Job openings | ✓ | ✓ |
| Events | ✓ | ✓ |
| SOPs | — (office does not apply) | ✓, group-wide SOPs always included |
| Announcements | ✓, "All offices" items always included | — |

The page subtitle shows the active scope, e.g. "Singapore · TABInsights" or "All offices and brands".

---

## 4. Module pages

| # | Module | Route | Icon | Phase | Status |
|---|---|---|---|---|---|
| 4.1 | Dashboard | `/` | LayoutDashboard | 1 | **Live** |
| 4.2 | Employees | `/employees` | Users | 4 (editing) | **Live** (read-only) |
| 4.3 | Leave & Attendance | `/whos-out` | CalendarOff | 4 (approvals) | **Live** (approvals stubbed) |
| 4.4 | Recruitment | `/recruitment` | Briefcase | 6 | Placeholder (not scoped) |
| 4.5 | SOP Library | `/sops` | BookOpen | 5 | Placeholder |
| 4.6 | Events & Forums | `/events` | CalendarDays | 5 | Placeholder |
| 4.7 | Announcements | `/announcements` | Megaphone | 5 | Placeholder |
| 4.8 | Settings | `/settings` | Settings | 3 | Placeholder |

Placeholder modules all render [`[section]/page.tsx`](../app/(dashboard)/[section]/page.tsx): centred title plus "This module is planned for Phase *N*." (Recruitment: "Recruitment is not scoped yet."). To build a module, add `app/(dashboard)/<route>/page.tsx` — a static route wins over the dynamic `[section]` one.

### 4.1 Dashboard — `/`

Source: [app/(dashboard)/page.tsx](../app/(dashboard)/page.tsx). Rendered per request (`connection()`) because every figure depends on "today" (Singapore time). Picks one of two views by role.

#### HR overview (Manager, HR Admin, Super Admin)

```
HR overview
<weekday, date> · <scope>
┌──────┬──────┬──────┬──────┐
│ KPI  │ KPI  │ KPI  │ KPI  │   2 cols → xl 4
└──────┴──────┴──────┴──────┘
┌──────────────────────┬────────┐
│ Headcount by dept    │Pending │   lg: 2/3 + 1/3
│                      │approval│
└──────────────────────┴────────┘
┌────────┬────────┬────────┐
│Out this│New     │Coming  │   md 2 → xl 3
│week    │joiners │up      │
└────────┴────────┴────────┘
┌─────────────┬─────────────┐
│ Headcount   │ SOP Library │   lg: 1/2 + 1/2
│ trend       │             │
└─────────────┴─────────────┘
```

**KPI row**

| Card | Value | Sub-line | Trend |
|---|---|---|---|
| Total employees | Active today | — | ± vs 30 days ago (up = green) |
| Open positions | Open job openings | — | "*n* opened in 30 days" (neutral) |
| On leave / WFH today | leave + WFH | "*n* leave · *n* WFH" | ± vs 7 days ago (up = red, down = green) |
| Attrition (12 months) | Leavers in last 365 days ÷ average of headcount now and a year ago | — | "*n* leavers in 12 months" (neutral) |

A person on leave who also logged WFH counts once, as leave.

**Panels**

| Panel | Component | Content |
|---|---|---|
| Headcount by department | `DepartmentBars` | Horizontal bars, largest first, count per department |
| Pending approvals | `ApprovalsPanel` | Pending absences from today on. First gets Approve/Decline, next 3 get Review; all toast "arrive in Phase 4". Badge = total open |
| Out this week | `OutThisWeekPanel` | Approved leave overlapping Mon–Fri (next week on weekends), first 5, with weekday span |
| New joiners | `NewJoinersPanel` | Hired in last 90 days, newest 4. Badge: Onboarding (≤30 days), Joined / Starts *date* |
| Coming up | `EventsPanel` | First 4 upcoming events |
| Headcount trend | `HeadcountChart` | Area chart, active employees at each of last 12 month-ends (current month = today) |
| SOP Library | `SopPanel` | Searchable list, newest first, stale toggle (see §5) |

#### Staff view (Employee)

Shown to the signed-in employee; leave balance and greeting are theirs.

```
Good day, <first name>
<title> · <department> · <office> · <weekday, date>
┌────────────┬──────────────────────┐
│ My leave   │ Who's out            │
└────────────┴──────────────────────┘
┌──────────────────────┬────────────┐
│ My SOPs              │ Announce.  │
│                      │ Events (5) │
└──────────────────────┴────────────┘
```

| Panel | Component | Content |
|---|---|---|
| My leave balance | `LeaveBalancePanel` | Annual / sick / other: days left of entitlement with progress bar; pending requests list |
| Who's out | `WhosOutPanel` | Mon–Fri strip with leave/WFH counts (today highlighted), then today's list. On weekends shows next week |
| My SOPs | `SopPanel` | SOPs for own department plus group-wide SOPs |
| Announcements | `AnnouncementsPanel` | Latest 5, office-filtered |
| Upcoming events | `EventsPanel` | First 5 |

### 4.2 Employees — `/employees`

Source: [employees/page.tsx](../app/(dashboard)/employees/page.tsx) → [DirectoryTable](../components/directory-table.tsx). Data: `getDirectory(filter)` — current and incoming staff (exited excluded), sorted by name.

```
Employee directory                                   [Export CSV]
<n> people across <n> departments and <n> offices
┌ Search ─────────────┬ Department ▾ ┬ Status ▾ ┐
└─────────────────────┴──────────────┴──────────┘
┌ Name/email │ Role │ Department │ Office │ Start date │ Status ┐
│ … 10 rows per page, scrolls sideways under 860px …           │
└ Showing 1–10 of n                          ‹ 1 2 3 4 5 › ──────┘
```

| Item | Detail |
|---|---|
| Office / brand | From the URL filter (top bar), so there is no Location select on the page |
| Search, department, status, paging | Client-side over the loaded rows |
| Status | Derived: *Notice period* (future `exit_date`), *Starting soon* (future `hire_date`), *On leave* (approved leave today), *Probation* (hired ≤ 90 days ago), else *Active* |
| Export CSV | Downloads the currently filtered rows (all pages) |
| Employee role | Status column, status filter and status in CSV hidden; status is stripped server-side so it never reaches the browser |

### 4.3 Leave & Attendance — `/whos-out`

Source: [whos-out/page.tsx](../app/(dashboard)/whos-out/page.tsx). "This week" = Mon–Fri, next week on weekends.

```
Leave & attendance
Week of 23–27 November 2026
┌ Pending ┬ In office ┬ WFH ┬ On leave ┐   today
┌ Team calendar ─────────────────────────┐
│ legend · rows = people away this week  │   bars span consecutive days
└────────────────────────────────────────┘
┌ Leave requests ────── n awaiting ──────┐   manager / HR only
└────────────────────────────────────────┘
```

| Piece | Component | Detail |
|---|---|---|
| Today tiles | `KpiCard` (no trend) | In office = active headcount − leave − WFH. Pending tile manager/HR only |
| Team calendar | `TeamCalendar` | Approved + (manager/HR) pending absences. Annual = brand blue, sick = red, other = amber, WFH = indigo, pending = dashed. Leave beats WFH on overlap |
| Leave requests | `LeaveRequestsPanel` | Every pending request from today on, with dates, day count and days left after (from `leave_balances`). Approve / Decline toast "arrive in Phase 4" — the schema has no declined status yet |

### 4.4 Recruitment — `/recruitment` (Phase 6)

Not scoped. Data exists: `job_openings` table feeds the Open positions KPI; Post Job quick action reserved.

### 4.5 SOP Library — `/sops` (Phase 5)

Placeholder today. Dashboard `SopPanel` already provides search and stale filtering. SOP sources live as Markdown in [content/sops/](../content/sops/) (seeded into `sops`). Editing restricted to HR Admin / Super Admin (`canEditSops`).

### 4.6 Events & Forums — `/events` (Phase 5)

Placeholder today. Dashboard `EventsPanel` lists upcoming events with their linked SOP.

### 4.7 Announcements — `/announcements` (Phase 5)

Placeholder today. Staff view shows the latest 5 via `AnnouncementsPanel`.

### 4.8 Settings — `/settings` (Phase 3)

Placeholder today.

---

## 5. Shared components

### Layout

| Component | File | Use |
|---|---|---|
| `Panel` | [components/panel.tsx](../components/panel.tsx) | Card with title (`text-sm font-semibold`), optional description, body. Wrap every dashboard section in one |
| `PageTitle` | inside `page.tsx` | `h1` (`text-xl font-semibold`) + muted subtitle |
| `KpiCard` | [components/kpi-card.tsx](../components/kpi-card.tsx) | Uppercase label, large tabular value, optional sub-line, trend chip |

**Trend chip tones** (`deltaTrend(delta, suffix, goodWhenUp)`)

| Tone | Colour | Icon | Meaning |
|---|---|---|---|
| `up` | emerald | ↗ / ↘ | Good change |
| `down` | red | ↗ / ↘ | Bad change |
| `flat` | muted | — | No change / neutral info |
| `warn` | amber | ⚠ | Needs attention |

Colour shows good/bad; arrow shows direction. They differ when "down is good" (fewer people out → green ↘).

### Panels

| Component | Key behaviour | Empty state |
|---|---|---|
| `SopPanel` (client) | Text search over title, owner, department, tags. "*n* stale (>90 days)" toggle appears only when stale SOPs exist. Stale rows get red badge. External-link icon opens SharePoint in new tab. List scrolls at 384px | "No SOPs match." |
| `EventsPanel` | Date block (day + month), name, brand · office, "until" for multi-day, linked SOP. Optional `limit`. Scrolls at 384px | "No upcoming events for this filter." |
| `WhosOutPanel` | 5-day strip, today outlined in primary. List: plane icon (red) = leave, home icon (teal) = WFH | "Everyone is in today." |
| `LeaveBalancePanel` | Days left of entitled, progress bar (`role="img"` with label), pending list | "None." for pending |
| `AnnouncementsPanel` | Primary left border, title, body, date · office | — |
| `ApprovalsPanel` | Pending requests; first gets Approve/Decline, next 3 Review (all toast) | — |
| `OutThisWeekPanel` | Approved leave this week, first 5, with weekday span | — |
| `NewJoinersPanel` | Newest 4 hires (90 days), Onboarding / Joined / Starts badge | — |
| `LeaveRequestsPanel` | Pending requests with day count and days left after; Approve/Decline toast | — |
| `TeamCalendar` | Mon–Fri grid, one row per person away, bars span consecutive days, pending dashed | — |

### Charts

| Component | Library | Notes |
|---|---|---|
| `HeadcountChart` | Recharts `AreaChart` | 256px tall, `--chart-1` stroke with fading gradient, y-axis from 0, integer ticks |
| `DepartmentBars` | Plain CSS | Single `--primary` colour, largest first; every value printed, so bars never carry meaning alone |

### Primitives — `components/ui/`

shadcn components on Base UI: `Badge`, `Button`, `Card`, `Input`, `Sonner`. Icons: `lucide-react`.

---

## 6. Design tokens

Defined in [app/globals.css](../app/globals.css). Font: **Public Sans** (`--font-sans`). Light theme only.

| Token | Value | Use |
|---|---|---|
| `--primary` | `#004EA8` | TAB blue: active states, links, bars, today highlight |
| `--secondary` / `--accent` | `#EEF3FA` | Tinted backgrounds, date blocks, department chips |
| `--background` | `#F6F8FB` | Page |
| `--card` | `#FFFFFF` | Panels, top bar |
| `--foreground` | `#1A1A1A` | Body text |
| `--muted-foreground` | `#5A6472` | Labels, sub-lines |
| `--border` | `#E3E7ED` | Card and list borders |
| `--destructive` | `#E4002B` | Stale SOPs, leave icon, bad trends |
| `--ring` | `#3A7BC8` | Focus outline |
| `--gold` | `#C7A349` | Brand accent |
| `--teal` | `#0096A8` | WFH icon |
| `--chart-1…7` | blue, light blue, teal, gold, slate, red, pale blue | Chart series |

Brand assets (logos, brand guide PDF) are in [Assets/](../Assets/).

---

## 7. Responsive behaviour

| Breakpoint | Change |
|---|---|
| < 768px (`md`) | Sidebar hidden, bottom tab bar instead; top bar wraps; page padding 16px; KPI grid 2 columns |
| ≥ 768px | Sidebar shown; padding 32px |
| ≥ 1024px (`lg`) | Panel rows split 2/3 + 1/3 |
| ≥ 1280px (`xl`) | KPI grid 4 columns |

The bottom tab bar holds Home, People, Leave and SOPs only; the other modules are desktop-only until a "More" sheet exists.

---

## 8. Accessibility conventions

- Icons decorative by default (`aria-hidden`); icon-only links carry `aria-label` (e.g. "Open *SOP* in SharePoint").
- Selects labelled (`aria-label="Office"`, `"Brand"`; role switcher wrapped in `<label>`).
- Stale toggle uses `aria-pressed`; active nav uses `aria-current="page"`.
- KPI section has `aria-label="Key figures"`; loading skeleton has `aria-busy`.
- Numbers use `tabular-nums` so columns align.
- Charts never rely on colour alone (legend shows values).

---

## 9. Adding a module page — checklist

1. Create `app/(dashboard)/<route>/page.tsx` (overrides the placeholder).
2. Read filters with `parseFilter(await searchParams)`; gate with `currentRole()` + helpers from `lib/role.ts`.
3. Fetch only through `lib/data.ts` — add a function there if needed.
4. Start with `PageTitle`, build sections from `Panel`, reuse existing panels.
5. Wire the matching quick action in `topbar-controls.tsx` (replace the toast).
6. Update the module's `phase`/status in this guide.
