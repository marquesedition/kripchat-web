create extension if not exists pgcrypto;

do $$
begin
  if exists (select 1 from pg_type where typname = 'conversation_type') then
    alter type public.conversation_type add value if not exists 'group';
  end if;
end $$;

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.conversations
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists last_message_at timestamptz,
  add column if not exists encryption_version text not null default 'device-envelope-v1',
  add column if not exists group_name_ciphertext text,
  add column if not exists group_avatar_ciphertext text;

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_name text,
  public_identity_key text not null,
  public_signed_prekey text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz
);

create table if not exists public.prekeys (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  key_id text not null,
  public_prekey text not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  unique (device_id, key_id)
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  muted_until timestamptz,
  archived_at timestamptz,
  pinned_at timestamptz,
  read_receipts_enabled boolean not null default true,
  disappearing_messages_enabled boolean not null default false,
  expiration_seconds int check (expiration_seconds is null or expiration_seconds > 0),
  primary key (conversation_id, user_id)
);

insert into public.conversation_members (conversation_id, user_id, role, joined_at)
select cp.conversation_id, cp.profile_id, 'member', cp.created_at
from public.conversation_participants cp
on conflict (conversation_id, user_id) do nothing;

create table if not exists public.encrypted_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(id) on delete cascade,
  sender_device_id uuid not null references public.devices(id) on delete restrict,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  recipient_device_id uuid not null references public.devices(id) on delete restrict,
  message_type text not null default 'text' check (message_type in ('text', 'image', 'audio', 'video', 'document', 'location', 'system')),
  ciphertext text not null check (ciphertext !~* '^[[:space:]]*$'),
  crypto_metadata jsonb not null default '{}'::jsonb,
  encrypted_file_url text,
  file_type text,
  file_size bigint,
  encrypted_file_key text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  expires_at timestamptz,
  deleted_for_all_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index if not exists devices_user_active_idx on public.devices(user_id, revoked_at, last_seen_at desc);
create index if not exists prekeys_device_unused_idx on public.prekeys(device_id, used_at) where used_at is null;
create index if not exists conversation_members_user_idx on public.conversation_members(user_id, archived_at, pinned_at desc);
create index if not exists encrypted_messages_recipient_device_idx on public.encrypted_messages(recipient_device_id, created_at desc);
create index if not exists encrypted_messages_sender_idx on public.encrypted_messages(sender_user_id, created_at desc);
create index if not exists encrypted_messages_conversation_idx on public.encrypted_messages(conversation_id, created_at desc);
create index if not exists blocked_users_blocked_idx on public.blocked_users(blocked_id);

alter table public.devices enable row level security;
alter table public.prekeys enable row level security;
alter table public.conversation_members enable row level security;
alter table public.encrypted_messages enable row level security;
alter table public.blocked_users enable row level security;

create or replace function public.is_conversation_member_v2(p_conversation_id uuid, p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = p_conversation_id
      and cm.user_id = p_user_id
      and cm.left_at is null
  )
  or exists (
    select 1
    from public.conversation_participants cp
    where cp.conversation_id = p_conversation_id
      and cp.profile_id = p_user_id
  );
$$;

create or replace function public.users_blocked_either_way(p_user_a uuid, p_user_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.blocked_users b
    where (b.blocker_id = p_user_a and b.blocked_id = p_user_b)
       or (b.blocker_id = p_user_b and b.blocked_id = p_user_a)
  );
$$;

create or replace function public.sync_conversation_members_from_participants()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.conversation_members (conversation_id, user_id, role, joined_at)
  values (new.conversation_id, new.profile_id, 'member', coalesce(new.created_at, now()))
  on conflict (conversation_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists sync_conversation_members_from_participants on public.conversation_participants;
create trigger sync_conversation_members_from_participants
after insert on public.conversation_participants
for each row execute function public.sync_conversation_members_from_participants();

create or replace function public.touch_conversation_from_encrypted_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now(), last_message_at = coalesce(new.sent_at, now())
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists encrypted_messages_touch_conversation on public.encrypted_messages;
create trigger encrypted_messages_touch_conversation
after insert on public.encrypted_messages
for each row execute function public.touch_conversation_from_encrypted_message();

create or replace function public.search_profiles_by_username_v2(search_username text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.username ilike lower(regexp_replace(coalesce(trim(search_username), ''), '[^a-z0-9_]', '', 'g')) || '%'
  order by p.username
  limit 20;
$$;

grant execute on function public.search_profiles_by_username_v2(text) to authenticated;

create policy "Users insert their own devices"
on public.devices for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Authenticated users read public device bundles"
on public.devices for select
to authenticated
using (revoked_at is null or (select auth.uid()) = user_id);

create policy "Users update their own devices"
on public.devices for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Device owners insert prekeys"
on public.prekeys for insert
to authenticated
with check (
  exists (
    select 1 from public.devices d
    where d.id = device_id and d.user_id = (select auth.uid())
  )
);

create policy "Authenticated users read public prekeys"
on public.prekeys for select
to authenticated
using (
  exists (
    select 1 from public.devices d
    where d.id = device_id and d.revoked_at is null
  )
);

create policy "Device owners update prekeys"
on public.prekeys for update
to authenticated
using (
  exists (
    select 1 from public.devices d
    where d.id = device_id and d.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.devices d
    where d.id = device_id and d.user_id = (select auth.uid())
  )
);

create policy "Members read conversation membership"
on public.conversation_members for select
to authenticated
using (public.is_conversation_member_v2(conversation_id, (select auth.uid())));

create policy "Users update their member privacy controls"
on public.conversation_members for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Members insert encrypted messages from own devices"
on public.encrypted_messages for insert
to authenticated
with check (
  sender_user_id = (select auth.uid())
  and public.is_conversation_member_v2(conversation_id, (select auth.uid()))
  and public.is_conversation_member_v2(conversation_id, recipient_user_id)
  and not public.users_blocked_either_way(sender_user_id, recipient_user_id)
  and exists (
    select 1 from public.devices d
    where d.id = sender_device_id
      and d.user_id = (select auth.uid())
      and d.revoked_at is null
  )
  and exists (
    select 1 from public.devices d
    where d.id = recipient_device_id
      and d.user_id = recipient_user_id
      and d.revoked_at is null
  )
);

create policy "Recipients and senders read encrypted messages"
on public.encrypted_messages for select
to authenticated
using (
  sender_user_id = (select auth.uid())
  or exists (
    select 1 from public.devices d
    where d.id = recipient_device_id
      and d.user_id = (select auth.uid())
      and d.revoked_at is null
  )
);

create policy "Recipients update delivery receipts"
on public.encrypted_messages for update
to authenticated
using (
  exists (
    select 1 from public.devices d
    where d.id = recipient_device_id
      and d.user_id = (select auth.uid())
      and d.revoked_at is null
  )
  or sender_user_id = (select auth.uid())
)
with check (
  exists (
    select 1 from public.devices d
    where d.id = recipient_device_id
      and d.user_id = (select auth.uid())
      and d.revoked_at is null
  )
  or sender_user_id = (select auth.uid())
);

create policy "Users manage their own blocks"
on public.blocked_users for all
to authenticated
using (blocker_id = (select auth.uid()))
with check (blocker_id = (select auth.uid()));

create or replace function public.create_direct_conversation_v2(peer_id uuid)
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

  if public.users_blocked_either_way(current_user_id, peer_id) then
    raise exception 'conversation blocked';
  end if;

  if not exists (select 1 from public.profiles where id = peer_id) then
    raise exception 'peer not found';
  end if;

  select cm1.conversation_id into existing_id
  from public.conversation_members cm1
  join public.conversation_members cm2 on cm2.conversation_id = cm1.conversation_id
  join public.conversations c on c.id = cm1.conversation_id
  where c.type::text = 'direct'
    and cm1.user_id = current_user_id
    and cm2.user_id = peer_id
    and cm1.left_at is null
    and cm2.left_at is null
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into public.conversations(type, created_by, encryption_version)
  values ('direct', current_user_id, 'device-envelope-v1')
  returning id into new_conversation_id;

  insert into public.conversation_participants(conversation_id, profile_id)
  values
    (new_conversation_id, current_user_id),
    (new_conversation_id, peer_id)
  on conflict do nothing;

  insert into public.conversation_members(conversation_id, user_id, role)
  values
    (new_conversation_id, current_user_id, 'owner'),
    (new_conversation_id, peer_id, 'member')
  on conflict (conversation_id, user_id) do nothing;

  return new_conversation_id;
end;
$$;

grant execute on function public.create_direct_conversation_v2(uuid) to authenticated;
grant select, insert, update, delete on public.devices to authenticated;
grant select, insert, update, delete on public.prekeys to authenticated;
grant select, insert, update, delete on public.conversation_members to authenticated;
grant select, insert, update, delete on public.encrypted_messages to authenticated;
grant select, insert, update, delete on public.blocked_users to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.encrypted_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
