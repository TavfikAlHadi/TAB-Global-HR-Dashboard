-- RLS check. Paste into Supabase SQL editor after seeding + migration 0003.
-- Impersonates users inside a transaction and rolls back. Any failed assert aborts with its message.
begin;

-- 1. Plain employee with a manager
select set_config('request.jwt.claims', json_build_object('email', (
  select upper(email) from employees  -- upper(): proves case-insensitive match
  where role = 'employee' and exit_date is null and manager_id is not null
    and not exists (select 1 from employees r where r.manager_id = employees.id) limit 1), 'app_metadata', json_build_object('provider','azure'))::text, true);
set local role authenticated;
do $$ begin
  assert current_employee_id() is not null, 'employee matched by email';
  assert (select count(*) from employees) > 1, 'employee can read directory';
  assert (select count(distinct employee_id) from leave_balances) <= 1, 'employee sees only own balances';
  assert not exists (select 1 from leave_balances where employee_id <> current_employee_id()), 'no other balances';
  assert not exists (select 1 from absences where status = 'pending' and employee_id <> current_employee_id()), 'no others pending leave';
end $$;
reset role;

-- 2. Unknown account
select set_config('request.jwt.claims', json_build_object('email', 'nobody@example.com', 'app_metadata', json_build_object('provider','azure'))::text, true);
set local role authenticated;
do $$ begin
  assert current_employee_id() is null, 'unknown email not matched';
  assert (select count(*) from employees) = 0, 'unknown user reads no employees';
  assert (select count(*) from absences) = 0, 'unknown user reads no absences';
end $$;
reset role;

-- 3. Leaver (exit date in the past) gets nothing
select set_config('request.jwt.claims', json_build_object('email', (
  select email from employees where exit_date < current_date limit 1), 'app_metadata', json_build_object('provider','azure'))::text, true);
set local role authenticated;
do $$ begin
  assert current_employee_id() is null, 'leaver not matched';
end $$;
reset role;

-- 4. HR admin sees everyone's balances and pending leave
select set_config('request.jwt.claims', json_build_object('email', (
  select email from employees where role = 'hr_admin' and exit_date is null limit 1), 'app_metadata', json_build_object('provider','azure'))::text, true);
set local role authenticated;
do $$ begin
  assert is_hr(), 'hr_admin is HR';
  assert (select count(distinct employee_id) from leave_balances) > 1, 'HR sees all balances';
end $$;
reset role;

-- 5. Known active employee email via a non-Azure provider is not matched
select set_config('request.jwt.claims', json_build_object('email', (
  select email from employees where exit_date is null limit 1), 'app_metadata', json_build_object('provider','email'))::text, true);
set local role authenticated;
do $$ begin
  assert current_employee_id() is null, 'non-Azure login not matched';
end $$;
reset role;

rollback;
select 'RLS check passed' as result;
