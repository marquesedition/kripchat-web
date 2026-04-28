alter table public.profiles
add column if not exists e2ee_public_key text;

alter table public.profiles
drop constraint if exists profiles_e2ee_public_key_format;

alter table public.profiles
add constraint profiles_e2ee_public_key_format
check (length(trim(e2ee_public_key)) > 0);

do $$
declare
  missing_count bigint;
begin
  select count(*) into missing_count
  from public.profiles
  where e2ee_public_key is null or length(trim(e2ee_public_key)) = 0;

  if missing_count > 0 then
    raise exception using
      message = format('Cannot enforce non-null e2ee_public_key: %s profile rows are missing it. Reset/backfill profiles first.', missing_count),
      errcode = '23514';
  end if;
end;
$$;

alter table public.profiles
alter column e2ee_public_key set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  fallback_username text;
  requested_e2ee_public_key text;
begin
  requested_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '[^a-z0-9_]', '', 'g'));
  fallback_username := 'operator_' || substr(replace(new.id::text, '-', ''), 1, 8);
  requested_e2ee_public_key := trim(coalesce(new.raw_user_meta_data->>'e2ee_public_key', ''));

  if requested_e2ee_public_key = '' then
    raise exception 'missing e2ee_public_key in signup metadata';
  end if;

  insert into public.profiles (id, username, e2ee_public_key)
  values (
    new.id,
    case when requested_username ~ '^[a-z0-9_]{3,24}$' then requested_username else fallback_username end,
    requested_e2ee_public_key
  )
  on conflict (id) do update
  set
    username = excluded.username,
    e2ee_public_key = excluded.e2ee_public_key;

  return new;
end;
$$;
