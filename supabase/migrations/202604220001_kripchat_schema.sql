create extension if not exists pgcrypto;

create type public.conversation_type as enum ('direct');
create type public.message_status as enum ('sent', 'delivered');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,24}$'),
  avatar_url text,
  push_token text,
  online_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  type public.conversation_type not null default 'direct',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversation_participants (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(trim(body)) between 1 and 2000),
  client_id text,
  status public.message_status not null default 'sent',
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx on public.messages(conversation_id, created_at desc);
create index messages_sender_idx on public.messages(sender_id);
create index participants_profile_idx on public.conversation_participants(profile_id);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_member(conversation_id uuid, user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = is_conversation_member.conversation_id
      and cp.profile_id = is_conversation_member.user_id
  );
$$;

create policy "Profiles are readable by signed in users"
on public.profiles for select
to authenticated
using (true);

create policy "Users update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Members read conversations"
on public.conversations for select
to authenticated
using (public.is_conversation_member(id, (select auth.uid())));

create policy "Members read participants"
on public.conversation_participants for select
to authenticated
using (public.is_conversation_member(conversation_id, (select auth.uid())));

create policy "Members read messages"
on public.messages for select
to authenticated
using (public.is_conversation_member(conversation_id, (select auth.uid())));

create policy "Members send messages"
on public.messages for insert
to authenticated
with check (
  (select auth.uid()) = sender_id
  and public.is_conversation_member(conversation_id, (select auth.uid()))
);

create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_username text;
  fallback_username text;
begin
  requested_username := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', ''), '[^a-z0-9_]', '', 'g'));
  fallback_username := 'operator_' || substr(replace(new.id::text, '-', ''), 1, 8);

  insert into public.profiles (id, username)
  values (
    new.id,
    case when requested_username ~ '^[a-z0-9_]{3,24}$' then requested_username else fallback_username end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.create_direct_conversation(peer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_id uuid;
  new_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  if peer_id = current_user_id then
    raise exception 'cannot chat with yourself';
  end if;

  if not exists (select 1 from public.profiles where id = peer_id) then
    raise exception 'peer not found';
  end if;

  select cp1.conversation_id into existing_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
  join public.conversations c on c.id = cp1.conversation_id
  where c.type = 'direct'
    and cp1.profile_id = current_user_id
    and cp2.profile_id = peer_id
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations(type) values ('direct')
  returning id into new_conversation_id;

  insert into public.conversation_participants(conversation_id, profile_id)
  values
    (new_conversation_id, current_user_id),
    (new_conversation_id, peer_id);

  return new_conversation_id;
end;
$$;

grant execute on function public.create_direct_conversation(uuid) to authenticated;

alter publication supabase_realtime add table public.messages;
