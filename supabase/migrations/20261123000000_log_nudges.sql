-- Help with forgotten counter taps: a gentle push when feeds have gone unlogged for long (young babies),
-- and an evening "isi yang terlewat" prompt at recap_time. One switch for both; on by default.
alter table public.user_settings
  add column log_nudges boolean not null default true,
  add column recap_time time not null default '20:00';
