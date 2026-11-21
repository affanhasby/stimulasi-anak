-- Email reminders: a send log (no duplicates on retries) and an hourly schedule calling the send-reminders function.

create table public.reminder_log (
  user_id uuid not null references auth.users on delete cascade,
  child_id uuid not null references public.children on delete cascade,
  reminder_key text not null, -- <dose>:lead:<n> | <dose>:deadline | <dose>:nudge:<n>
  sent_on date not null,
  created_at timestamptz not null default now(),
  primary key (child_id, reminder_key, sent_on)
);
alter table public.reminder_log enable row level security; -- no policies: only the service role reads or writes it
revoke all on public.reminder_log from anon, authenticated;

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- The function URL and secret differ per environment, so they live in Vault (set them once per project):
--   select vault.create_secret('<https://<ref>.supabase.co or http://kong:8000>', 'project_url');
--   select vault.create_secret('<same value as the function's REMINDER_SECRET>', 'reminder_secret');
-- Without both secrets the job runs and does nothing.
select cron.schedule(
  'send-reminders',
  '5 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/send-reminders',
    headers := jsonb_build_object('content-type', 'application/json', 'x-reminder-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminder_secret')),
    body := '{}'::jsonb
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'project_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'reminder_secret');
  $$
);
