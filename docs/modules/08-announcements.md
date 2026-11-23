# 8. Announcements

**Phase 5 · Placeholder** (staff panel live) · Route: `/announcements`, `/announcements/[id]` · Code today: [announcements-panel.tsx](../../components/panels/announcements-panel.tsx)

## Purpose

Company and office news from HR and management in one place — policy changes, office closures, welcomes, reminders — instead of scattered all-staff emails.

## Context

- An announcement targets **all offices** (`office_id` null) or **one office**. Staff see group-wide items plus their office's.
- The staff dashboard already shows the latest 5. There is no full page, no authoring UI and no way to keep an important item on top.
- Short-lived items (e.g. "office closed Friday") should drop off by themselves.

## Requirements

| # | Requirement | Phase | Status |
|---|---|---|---|
| N1 | Staff dashboard: latest 5, office-filtered | 1 | Done |
| N2 | Announcements page: all current items, newest first, pinned on top; filter by office | 5 | Planned |
| N3 | HR Admin / Super Admin create, edit, delete announcements | 5 | Planned |
| N4 | Audience: all offices or one or more offices | 5 | Planned |
| N5 | Pin (stays on top until unpinned) | 5 | Planned |
| N6 | Schedule: `published_at` in the future hides it until then; optional `expires_at` hides it after | 5 | Planned |
| N7 | Body in Markdown (links, lists), rendered safely | 5 | Planned |
| N8 | Unread dot for items published since the user's last visit | 5 | Planned (optional) |
| N9 | Show "New" announcements to Managers/HR on the HR overview as well | 5 | Planned |

## User experience flows

### Read news (any employee)

1. Dashboard **Announcements** panel shows the latest; pinned ones carry a pin icon.
2. **View all** → announcements page; office filter defaults to the top-bar office.
3. Click a title → full text with date, author and audience ("Singapore office").

### Post an announcement (HR Admin)

1. **Announcements → New announcement**.
2. Form: title, body (Markdown, Write/Preview), audience (All offices / pick offices), pin toggle, publish (Now / date-time), expires (optional date).
3. Preview card shows exactly how it will look on the dashboard.
4. **Publish** → toast "Published to Singapore, Kuala Lumpur" (or "Scheduled for Mon 9:00").

### Correct or withdraw (HR Admin)

Open announcement → **Edit** (save updates in place) or **Delete** → confirm "This removes it for everyone." → toast.

## Supabase

### Schema changes (`0009_announcements.sql`)

```sql
alter table announcements
  add column pinned     boolean not null default false,
  add column expires_at timestamptz,
  add column author_id  uuid references employees(id);

-- Multi-office audience. Null office_id keeps meaning "all offices"; extra offices go here.
create table announcement_offices (
  announcement_id uuid not null references announcements(id) on delete cascade,
  office_id       text not null references offices(id),
  primary key (announcement_id, office_id)
);
alter table announcement_offices enable row level security;
create policy "active staff read" on announcement_offices for select to authenticated
  using (current_employee_id() is not null);

-- Staff see only live items; HR also sees scheduled/expired ones.
drop policy "active staff read" on announcements;
create policy "read announcements" on announcements for select to authenticated using (
  current_employee_id() is not null and (
    is_hr() or (published_at <= now() and (expires_at is null or expires_at > now()))
  )
);
create policy "hr write announcements" on announcements for all to authenticated
  using (is_hr()) with check (is_hr());
create policy "hr write audience" on announcement_offices for all to authenticated
  using (is_hr()) with check (is_hr());
```

Migration step: move existing single `office_id` values into `announcement_offices` and set `office_id` null only if moving fully to the join table. Simpler option if N4 multi-office isn't needed: keep `office_id` and skip the join table.

### Writes

Server actions `createAnnouncement`, `updateAnnouncement`, `deleteAnnouncement` with plain RLS calls; audit via trigger.

### Reads

`getAnnouncements(filter)` (exists, limit 5) gains `limit` and ordering `pinned desc, published_at desc`. Add `getAnnouncement(id)`.

Unread (N8, optional): `announcement_reads (employee_id, last_seen_at)` — one row per person, updated when they open the page. Skip until someone asks.

## Out of scope

- Comments, reactions, read receipts.
- Email or Teams push (HR keeps sending all-staff email for urgent items).
- Images/attachments (link to SharePoint).
