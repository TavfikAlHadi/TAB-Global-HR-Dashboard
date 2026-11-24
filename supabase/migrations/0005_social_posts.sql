-- Recent social media posts: links HR pastes in so staff can open, like and share them on the platform.
-- Run once in the Supabase SQL editor after 0003 (uses current_employee_id() and is_hr()).

-- Survives the demo reseed: created_by is set null when employees are re-inserted.
create table social_posts (
  id         uuid primary key default gen_random_uuid(),
  platform   text not null check (platform in ('linkedin', 'facebook', 'instagram', 'tiktok')),
  url        text not null check (url ~ '^https://'),
  caption    text not null check (char_length(caption) between 1 and 280),
  posted_at  date not null default current_date,
  created_by uuid references employees(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on social_posts (posted_at desc);

alter table social_posts enable row level security;
grant select, insert, delete on social_posts to authenticated;

create policy "active staff read social posts" on social_posts for select to authenticated
  using (current_employee_id() is not null);
create policy "HR add social posts" on social_posts for insert to authenticated
  with check (is_hr() and created_by = current_employee_id());
create policy "HR remove social posts" on social_posts for delete to authenticated
  using (is_hr());
