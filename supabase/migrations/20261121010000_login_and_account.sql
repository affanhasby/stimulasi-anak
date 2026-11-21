-- Username login without exposing anyone's email, plus account deletion (UU PDP: the right to erase).

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table private.login_attempts (
  username text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index login_attempts_recent on private.login_attempts (username, at);

-- Returns the account email only when the password is right, so a username alone reveals nothing.
-- Five wrong passwords lock that username for 15 minutes; the client then signs in with the email as usual.
create or replace function public.login_email(p_username text, p_password text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user text := lower(trim(p_username));
  v_email text;
  v_hash text;
begin
  delete from private.login_attempts where at < now() - interval '1 day';
  if (select count(*) from private.login_attempts where username = v_user and not ok and at > now() - interval '15 minutes') >= 5 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  select u.email, u.encrypted_password into v_email, v_hash
  from public.profiles p join auth.users u on u.id = p.id
  where p.username = v_user;

  if v_hash is not null and v_hash = extensions.crypt(p_password, v_hash) then
    insert into private.login_attempts (username, ok) values (v_user, true);
    return v_email;
  end if;
  insert into private.login_attempts (username, ok) values (v_user, false);
  return null;
end $$;

revoke execute on function public.login_email(text, text) from public;
grant execute on function public.login_email(text, text) to anon, authenticated;

-- Deletes the signed-in user; every row cascades from auth.users.
create or replace function public.delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
