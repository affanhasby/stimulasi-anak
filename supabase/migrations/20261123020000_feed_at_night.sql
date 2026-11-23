-- Young babies feed at night too: the feeding reminder may also run 21.00-07.00 (the others never do).
alter table public.user_settings add column feed_at_night boolean not null default true;
