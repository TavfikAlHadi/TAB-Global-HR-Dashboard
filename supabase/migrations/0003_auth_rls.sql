-- Phase 2: signed-in users read data through RLS. Matching a login to an employee lives only here.
-- security definer so policies can look up employees without recursing into employees' own RLS.

create or replace function public.current_employee_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from employees
  where lower(email) = lower(auth.jwt() ->> 'email')
    and (exit_date is null or exit_date >= current_date)
  limit 1
$$;

create or replace function public.is_hr() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from employees
                 where id = current_employee_id() and role in ('hr_admin', 'super_admin'))
$$;

create or replace function public.manages(emp uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from employees where id = emp and manager_id = current_employee_id())
$$;

revoke execute on function public.current_employee_id(), public.is_hr(), public.manages(uuid) from public, anon;
grant execute on function public.current_employee_id(), public.is_hr(), public.manages(uuid) to authenticated;

grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;

-- Company-wide reference data and directory: any active employee.
do $$
declare t text;
begin
  foreach t in array array['offices','brands','departments','employees','sops','events','announcements','job_openings'] loop
    execute format('create policy "active staff read" on %I for select to authenticated using (current_employee_id() is not null)', t);
  end loop;
end $$;

-- Who's out is public to staff; pending requests are private to self, manager, HR.
create policy "staff read absences" on absences for select to authenticated using (
  current_employee_id() is not null
  and (status = 'approved' or employee_id = current_employee_id() or manages(employee_id) or is_hr())
);

create policy "own team or HR read balances" on leave_balances for select to authenticated using (
  employee_id = current_employee_id() or manages(employee_id) or is_hr()
);
