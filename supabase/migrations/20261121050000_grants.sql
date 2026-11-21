-- Newer Supabase projects no longer grant table privileges to API roles by default.
-- Grant them explicitly; row level security (policies per user/child) still decides which rows each user sees.
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  public.profiles, public.user_settings, public.children, public.vaccine_records, public.activity_checks,
  public.milestone_answers, public.counter_events, public.alert_logs, public.health_checks, public.measurements,
  public.push_subscriptions
to authenticated;

grant all on all tables in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;

-- Only the reminder function (service role) touches the send log.
revoke all on public.reminder_log from authenticated, anon;
