-- Routine reminders per counter button (menyusu, cek popok, MP-ASI, tengkurap, tidur, pompa): on for every
-- active button unless switched off here (routine ids, see src/lib/routines.ts).
alter table public.user_settings add column routine_off text[] not null default '{}';

-- Interval reminders ("tiap 3 jam") need finer steps than hourly. Every run is idempotent (reminder_log).
select cron.unschedule('send-reminders');
select cron.schedule(
  'send-reminders',
  '*/15 * * * *',
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
