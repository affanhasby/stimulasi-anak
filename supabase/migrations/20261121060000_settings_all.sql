-- Every setting follows the account, so a second phone opens with the same choices.
-- (Push notifications stay per device: each phone must allow them itself.)
alter table public.user_settings
  add column text_size text not null default 'normal' check (text_size in ('normal', 'large')),
  add column seen_notices text[]; -- toasts already shown; null = take today's as the baseline
