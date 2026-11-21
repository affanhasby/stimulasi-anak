-- Vaccine not given (with reason), daily health check, and weight/length measurements.

alter table public.vaccine_records
  add column skip_reason text check (char_length(skip_reason) <= 40),
  add column note text check (char_length(note) <= 280);

-- One check per child per day: the parent's answers and the conclusion shown to them.
create table public.health_checks (
  child_id uuid not null references public.children on delete cascade,
  day date not null,
  answers jsonb not null default '{}', -- { question_id: true|false }
  result text not null check (result in ('aman', 'perhatian', 'bahaya')),
  checked_at timestamptz not null default now(),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (child_id, day)
);

create table public.measurements (
  id uuid primary key, -- made on the device, so offline entries sync without duplicates
  child_id uuid not null references public.children on delete cascade,
  measured_on date not null,
  weight_kg numeric(5, 2) check (weight_kg between 0.5 and 60),
  length_cm numeric(5, 1) check (length_cm between 30 and 150),
  method text check (method in ('telentang', 'berdiri')),
  deleted boolean not null default false,
  updated_at timestamptz not null default now()
);
create index measurements_child_idx on public.measurements (child_id, measured_on);

alter table public.user_settings alter column email_reminders set default false;

do $$
declare t text;
begin
  foreach t in array array['health_checks', 'measurements'] loop
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
    execute format('create index %I on public.%I (child_id, updated_at)', t || '_sync_idx', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own child rows" on public.%I for all to authenticated using (public.owns_child(child_id)) with check (public.owns_child(child_id))', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
