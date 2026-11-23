-- Own doctor/midwife as a WhatsApp button in emergency screens; the national hotlines can be hidden then.
alter table public.user_settings
  add column doctor_name text not null default '',
  add column doctor_phone text not null default '',
  add column show_hotlines boolean not null default true;
