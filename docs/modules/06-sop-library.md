# 6. SOP Library

**Phase 5 · Placeholder** (dashboard panel live) · Route: `/sops`, `/sops/[slug]`, `/sops/new`, `/sops/[slug]/edit` · Code today: [sop-panel.tsx](../../components/panels/sop-panel.tsx), [lib/sop.ts](../../lib/sop.ts), [content/sops/](../../content/sops/)

## Purpose

One searchable home for standard operating procedures across departments and brands: what to do, step by step, who owns it, and whether it's still current.

## Context

- 46 SOPs today, written as Markdown with frontmatter in `content/sops/` and seeded into the `sops` table (`body_md`). After Phase 5 the **database is the source of truth**; the Markdown files remain seed data for the demo.
- The authoritative signed/formatted document often lives in SharePoint or Drive. Each SOP links to it (`sharepoint_url`); the in-app body is the readable step-by-step version.
- An SOP is **stale** when `last_updated` is more than 90 days ago (`isStale` in `lib/sop.ts`, tested). Stale ones are flagged in red so owners keep them current.
- SOPs are either brand-specific (`brand_id`) or group-wide (`brand_id` null). Office does not apply.
- Events can link to the SOP that governs them (e.g. *Event day run sheet*).

## Requirements

| # | Requirement | Phase | Status |
|---|---|---|---|
| P1 | Dashboard panel: search, stale toggle, owner, last updated, SharePoint link | 1 | Done |
| P2 | Library page: search (title, tags, owner, body), filter by department, brand, stale | 5 | Planned |
| P3 | SOP page: rendered Markdown body, owner, department, brand, tags, last updated, stale banner, SharePoint link, linked events | 5 | Planned |
| P4 | HR Admin / Super Admin create and edit SOPs in-app (Markdown editor with preview) | 5 | Planned |
| P5 | Saving content updates `last_updated` to today; "Mark reviewed, no changes" also resets it | 5 | Planned |
| P6 | Archive (not delete) an SOP; archived hidden from staff, visible to HR | 5 | Planned |
| P7 | Version history: previous bodies kept, viewable, restorable | 5 | Planned |
| P8 | Owner sees "My SOPs needing review" on their dashboard | 5 | Planned |
| P9 | Markdown rendered safely (no raw HTML) | 5 | Planned |
| P10 | Staff see their department's SOPs first | 1 | Done (staff view) |

## User experience flows

### Find how to do something (any employee)

1. Sidebar **SOP Library** (mobile: **SOPs**), or the dashboard panel.
2. Types "expense"; results show title, department chip, owner, last updated; stale ones have a red badge.
3. Opens *Expense claims* → reads numbered steps on one page.
4. Needs the signed form → **Open in SharePoint** (new tab).
5. If stale, a banner says "Last reviewed 4 months ago — check with *owner* if in doubt."

### Write a new SOP (HR Admin)

1. Top bar **New SOP** or **SOP Library → New SOP**.
2. Form: title (slug generated), department, brand (or *Group-wide*), owner (any active employee), tags, SharePoint URL.
3. Body: Markdown editor with **Write / Preview** tabs; starter template with *Purpose*, *Scope*, *Steps*, *Contacts*.
4. **Publish** → toast; lands on the SOP page. `last_updated` = today.

### Review a stale SOP (HR Admin / owner via HR)

1. Dashboard SOP panel → **6 stale** toggle, or library filter *Stale*.
2. Opens one → **Edit** → updates steps → **Save** (stale badge disappears), or
3. Nothing changed → **Mark reviewed** → confirm → `last_updated` = today, version history records "reviewed, no changes".

### Restore a previous version (HR Admin)

SOP page → **History** → list of versions (date, editor) → open one → **Restore this version** → confirm → becomes the current body as a new version.

## Supabase

### Schema changes (`0007_sop_editing.sql`)

```sql
alter table sops
  add column archived_at timestamptz,
  add column updated_by  uuid references employees(id);

create table sop_versions (
  id         bigint generated always as identity primary key,
  sop_id     uuid not null references sops(id) on delete cascade,
  body_md    text not null,
  title      text not null,
  note       text,                    -- 'reviewed, no changes', 'restored from …'
  edited_by  uuid references employees(id),
  edited_at  timestamptz not null default now()
);
alter table sop_versions enable row level security;
create policy "hr read versions" on sop_versions for select to authenticated using (is_hr());

-- Staff read only live SOPs; HR reads all (replace the Phase 2 "active staff read" policy).
drop policy "active staff read" on sops;
create policy "read sops" on sops for select to authenticated
  using (current_employee_id() is not null and (archived_at is null or is_hr()));

create policy "hr insert sops" on sops for insert to authenticated with check (is_hr());
create policy "hr update sops" on sops for update to authenticated using (is_hr()) with check (is_hr());

-- Keep history automatically on every body/title change.
create function sop_snapshot() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into sop_versions (sop_id, body_md, title, edited_by) values (old.id, old.body_md, old.title, current_employee_id());
  return new;
end $$;
create trigger sops_history before update of body_md, title on sops for each row execute function sop_snapshot();

-- Full-text search across title, tags and body.
alter table sops add column search tsvector generated always as (
  to_tsvector('english', title || ' ' || array_to_string(tags, ' ') || ' ' || body_md)) stored;
create index on sops using gin (search);
```

`array_to_string` on a generated column requires an immutable wrapper in some Postgres versions; if the migration rejects it, wrap it in an `immutable` SQL function.

### Writes

Single-row writes, so plain RLS policies are enough (no RPC):

| Action | Call |
|---|---|
| Create | `db().from('sops').insert({..., last_updated: today, updated_by: me})` |
| Edit | `update({..., last_updated: today, updated_by: me})` — trigger saves the old version |
| Mark reviewed | `rpc('mark_sop_reviewed', {id})` — sets `last_updated`, inserts version note (no body change, so the trigger wouldn't fire) |
| Archive / unarchive | `update({archived_at: now() / null})` |
| Restore version | `update({body_md: version.body_md, title: version.title})` |

### Reads

`getSops(filter)` (exists) gains `q` (uses `search` via `textSearch`), department and stale filters. Add `getSop(slug)` with owner, linked events and (HR) versions.

### Rendering

Render `body_md` server-side with `react-markdown` with HTML disabled (P9). No new storage: attachments stay in SharePoint.

## Out of scope

- Approval workflow for SOP changes (HR Admin edits are trusted; history covers mistakes).
- Read receipts / acknowledgement tracking (revisit if compliance needs it).
- Syncing edits back into SharePoint files.
