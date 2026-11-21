-- Stimulasi Anak: user data. Content (vaccines, milestones, activities...) ships as JSON in the app.
-- Every row belongs to one auth user, directly or through children. Deleting the user deletes everything (UU PDP).
-- Sync: clients pull rows with updated_at > last pull; soft deletes (deleted / deleted_at) so deletions sync too.

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Profiles ------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  created_at timestamptz not null default now()
);

-- Signup passes the username in user metadata; the profile is created with the auth user.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username) values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

-- Lets the register form check a username before signing up (true/false only, reveals nothing else).
create or replace function public.username_available(name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select lower(name) ~ '^[a-z0-9_.]{3,20}$'
     and not exists (select 1 from public.profiles where username = lower(name));
$$;

-- Settings ------------------------------------------------------------------
create table public.user_settings (
  user_id uuid primary key references auth.users on delete cascade,
  reminder_lead_days smallint[] not null default '{1}',
  reminder_time time not null default '07:00',
  timezone text not null default 'Asia/Jakarta',
  email_reminders boolean not null default true,
  enabled_counters text[], -- null = defaults from counters.json
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  active_child_id uuid,
  updated_at timestamptz not null default now()
);

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Children ------------------------------------------------------------------
create table public.children (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nickname text not null default 'Si Kecil' check (char_length(nickname) between 1 and 40),
  birth_date date not null check (birth_date >= '2000-01-01'),
  sex text check (sex in ('M', 'F')),
  gestational_weeks smallint check (gestational_weeks between 22 and 42),
  schedule text not null default 'KEMENKES' check (schedule in ('KEMENKES', 'IDAI')),
  je_endemic boolean,
  rv_pentavalent boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index children_user_idx on public.children (user_id, updated_at);

-- Per-child records -----------------------------------------------------------
create table public.vaccine_records (
  child_id uuid not null references public.children on delete cascade,
  dose_key text not null, -- dose id, or <id>#<n> for repeats
  status text not null check (status in ('done', 'skipped')),
  given_date date,
  place text check (char_length(place) <= 80),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (child_id, dose_key)
);

create table public.activity_checks (
  child_id uuid not null references public.children on delete cascade,
  day date not null,
  activity_id text not null,
  done_at timestamptz not null default now(),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (child_id, day, activity_id)
);

create table public.milestone_answers (
  child_id uuid not null references public.children on delete cascade,
  item_id text not null,
  answer text not null check (answer in ('yes', 'no')),
  answered_at timestamptz not null default now(),
  history jsonb not null default '[]', -- earlier answers, for regression red flags
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (child_id, item_id)
);

create table public.counter_events (
  id uuid primary key, -- generated on the device so offline taps sync without duplicates
  child_id uuid not null references public.children on delete cascade,
  counter_id text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  value jsonb, -- colour / ml / side / celsius
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create index counter_events_child_idx on public.counter_events (child_id, start_at);

create table public.alert_logs (
  child_id uuid not null references public.children on delete cascade,
  alert_id text not null,
  day date not null,
  dismissed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (child_id, alert_id, day)
);

-- updated_at + sync indexes ---------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['user_settings','children','vaccine_records','activity_checks','milestone_answers','counter_events','alert_logs'] loop
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
  foreach t in array array['vaccine_records','activity_checks','milestone_answers','counter_events','alert_logs'] loop
    execute format('create index %I on public.%I (child_id, updated_at)', t || '_sync_idx', t);
  end loop;
end $$;

-- Row level security ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.children enable row level security;
alter table public.vaccine_records enable row level security;
alter table public.activity_checks enable row level security;
alter table public.milestone_answers enable row level security;
alter table public.counter_events enable row level security;
alter table public.alert_logs enable row level security;

create policy "own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own settings" on public.user_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own children" on public.children for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.owns_child(cid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.children where id = cid and user_id = (select auth.uid()));
$$;

do $$
declare t text;
begin
  foreach t in array array['vaccine_records','activity_checks','milestone_answers','counter_events','alert_logs'] loop
    execute format('create policy "own child rows" on public.%I for all to authenticated using (public.owns_child(child_id)) with check (public.owns_child(child_id))', t);
  end loop;
end $$;

-- Lock down: no anonymous access to data; only the functions the client needs.
revoke all on all tables in schema public from anon;
revoke execute on function public.handle_new_user() from anon, authenticated, public;
revoke execute on function public.touch_updated_at() from anon, authenticated, public;
grant execute on function public.username_available(text) to anon, authenticated;
