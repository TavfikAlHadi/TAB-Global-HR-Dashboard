-- TAB Global HR Dashboard — Phase 1 schema.
-- RLS is enabled everywhere with no policies: only the server (service-role key) can read/write.
-- Phase 2 adds per-role policies tied to Supabase Auth users.

create table offices (
  id   text primary key,           -- 'SG', 'BJ', 'DXB', 'KL', 'MNL'
  name text not null unique
);

create table brands (
  id   text primary key,           -- slug
  name text not null unique
);

create table departments (
  id   text primary key,           -- slug
  name text not null unique
);

create table employees (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  email         text not null unique,
  title         text not null,
  office_id     text not null references offices(id),
  brand_id      text not null references brands(id),
  department_id text not null references departments(id),
  role          text not null default 'employee'
                check (role in ('employee', 'manager', 'hr_admin', 'super_admin')),
  manager_id    uuid references employees(id),
  hire_date     date not null,
  exit_date     date,
  check (exit_date is null or exit_date >= hire_date)
);
create index on employees (office_id);
create index on employees (brand_id);

create table absences (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  kind        text not null check (kind in ('leave', 'wfh')),
  leave_type  text check (leave_type in ('annual', 'sick', 'other')),
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'approved' check (status in ('pending', 'approved')),
  check (end_date >= start_date),
  check ((kind = 'leave') = (leave_type is not null))
);
create index on absences (start_date, end_date);

create table leave_balances (
  employee_id uuid not null references employees(id) on delete cascade,
  year        int  not null,
  leave_type  text not null check (leave_type in ('annual', 'sick', 'other')),
  entitled    numeric(4,1) not null check (entitled >= 0),
  taken       numeric(4,1) not null default 0 check (taken >= 0),
  primary key (employee_id, year, leave_type)
);

create table sops (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  department_id  text not null references departments(id),
  brand_id       text references brands(id),            -- null = group-wide
  owner_id       uuid references employees(id),
  last_updated   date not null,
  tags           text[] not null default '{}',
  sharepoint_url text,
  body_md        text not null
);

create table events (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  brand_id   text not null references brands(id),
  office_id  text not null references offices(id),
  start_date date not null,
  end_date   date not null,
  sop_id     uuid references sops(id) on delete set null,
  check (end_date >= start_date)
);

create table announcements (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  body         text not null,
  office_id    text references offices(id),             -- null = all offices
  published_at timestamptz not null default now()
);

create table job_openings (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  department_id text not null references departments(id),
  office_id     text not null references offices(id),
  brand_id      text not null references brands(id),
  status        text not null default 'open' check (status in ('open', 'closed')),
  opened_at     date not null default current_date
);

alter table offices        enable row level security;
alter table brands         enable row level security;
alter table departments    enable row level security;
alter table employees      enable row level security;
alter table absences       enable row level security;
alter table leave_balances enable row level security;
alter table sops           enable row level security;
alter table events         enable row level security;
alter table announcements  enable row level security;
alter table job_openings   enable row level security;
