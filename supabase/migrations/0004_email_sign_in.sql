-- Interim sign-in: Supabase email + password until Microsoft 365 is configured. Azure logins stay accepted.
-- An email login counts only once Supabase has confirmed the address (auth.users.email_confirmed_at),
-- so with sign-ups disabled nobody can claim a staff address they don't control.
create or replace function public.current_employee_id() returns uuid
language sql stable security definer set search_path = public as $$
  select e.id from employees e
  where lower(e.email) = lower(auth.jwt() ->> 'email')
    and (e.exit_date is null or e.exit_date >= current_date)
    and (
      auth.jwt() -> 'app_metadata' ->> 'provider' = 'azure'
      or (auth.jwt() -> 'app_metadata' ->> 'provider' = 'email'
          and exists (select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null))
    )
  limit 1
$$;
