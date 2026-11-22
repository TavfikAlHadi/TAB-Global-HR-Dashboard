-- Newer Supabase projects don't auto-grant table privileges to API roles.
-- Phase 1: only the server (service_role) gets access. anon/authenticated stay locked out until Phase 2 RLS policies.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
