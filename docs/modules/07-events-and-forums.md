# 7. Events & Forums

**Phase 5 · Placeholder** (dashboard panel live) · Route: `/events`, `/events/[id]` · Code today: [events-panel.tsx](../../components/panels/events-panel.tsx)

## Purpose

A shared calendar of TAB Global's conferences, forums, roundtables, awards and webinars across brands and offices — so staff know what's coming, who is running it, and which SOP applies.

## Context

- Events are core business for The Asian Banker and its brands; many staff outside Events & Forums support them (editorial coverage, sales, research).
- The event *operations* (registrations, sponsors, venues) live in dedicated event tools. This module is the **internal awareness layer**: what, when, where, who leads, linked run-sheet SOP — not an event-management system.
- Each event belongs to one brand and one office (host); it may run several days.
- 13 upcoming events in the demo data; `events.sop_id` links to the governing SOP.

## Requirements

| # | Requirement | Phase | Status |
|---|---|---|---|
| V1 | Dashboard panel: upcoming events with date block, brand, office, linked SOP | 1 | Done |
| V2 | Events page: list (upcoming / past) and month calendar, filtered by top-bar office/brand | 5 | Planned |
| V3 | Event detail: name, type, dates, city/venue, format (in person / virtual / hybrid), brand, host office, lead, team, linked SOP, external website link | 5 | Planned |
| V4 | HR Admin / Super Admin create, edit, cancel events | 5 | Planned |
| V5 | Event lead can edit their own event | 5 | Planned |
| V6 | Staff assigned to an event see it under "My events" on the dashboard | 5 | Planned |
| V7 | Event dates shown on the leave team calendar as a hint ("Banking Forum in KL") so managers avoid approving leave for event staff | 5 | Planned |
| V8 | Cancelled events stay visible with a *Cancelled* badge | 5 | Planned |

## User experience flows

### What's coming up (any employee)

1. Dashboard **Coming up** panel or sidebar **Events & Forums**.
2. Default list: upcoming, nearest first; each row shows date block, name, brand · office, format badge.
3. Switch to **Calendar** for a month grid; office/brand filter narrows it.
4. Click an event → detail with lead, team and **Run sheet SOP** link.

### Add an event (HR Admin)

1. **Events & Forums → New event**.
2. Form: name, type (Forum · Conference · Roundtable · Awards · Webinar · Other), brand, host office, start/end date, city/venue, format, external URL, lead (employee), team (multi-select employees), linked SOP (search).
3. **Save** → toast; event appears on everyone's dashboard immediately.

### Staff an event (event lead)

1. Opens own event → **Edit team** → adds colleagues.
2. Those colleagues now see it in **My events**; their managers see the event marker when reviewing leave on those dates.

### Cancel or move (HR Admin / lead)

Edit dates → saved; or **Cancel event** → confirm with optional note → badge *Cancelled*, removed from "Coming up".

## Supabase

### Schema changes (`0008_events.sql`)

```sql
alter table events
  add column type        text not null default 'forum'
             check (type in ('forum', 'conference', 'roundtable', 'awards', 'webinar', 'other')),
  add column format      text not null default 'in_person'
             check (format in ('in_person', 'virtual', 'hybrid')),
  add column venue       text,
  add column url         text,
  add column lead_id     uuid references employees(id),
  add column cancelled_at timestamptz;

create table event_staff (
  event_id    uuid not null references events(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  primary key (event_id, employee_id)
);
alter table event_staff enable row level security;

create policy "active staff read" on event_staff for select to authenticated
  using (current_employee_id() is not null);

create policy "hr insert events" on events for insert to authenticated with check (is_hr());
create policy "hr or lead update events" on events for update to authenticated
  using (is_hr() or lead_id = current_employee_id())
  with check (is_hr() or lead_id = current_employee_id());

create policy "hr or lead manage staff" on event_staff for all to authenticated
  using (is_hr() or exists (select 1 from events e where e.id = event_id and e.lead_id = current_employee_id()))
  with check (is_hr() or exists (select 1 from events e where e.id = event_id and e.lead_id = current_employee_id()));
```

A lead can't reassign `lead_id` to someone else: add a trigger or route lead changes through an HR-only RPC if that matters.

### Writes

Plain RLS inserts/updates from server actions (`createEvent`, `updateEvent`, `cancelEvent`, `setEventStaff`); audit via trigger ([05](05-admin-and-settings.md)).

### Reads

`getEvents(filter)` (exists, upcoming) gains `range` and `includePast`. Add `getEvent(id)` (with staff, lead, SOP) and `getMyEvents()`. Team calendar ([04](04-leave-and-attendance.md)) calls `getEvents` for the visible week to draw markers.

## Out of scope

- Registration, ticketing, sponsor and speaker management (existing event tools).
- Public event pages.
- Outlook calendar invites.
