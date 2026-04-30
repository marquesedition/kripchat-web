create table if not exists public.chat_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (requester_id <> recipient_id)
);

create unique index if not exists chat_requests_pending_pair_idx
on public.chat_requests (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
where status = 'pending';

create index if not exists chat_requests_recipient_status_idx
on public.chat_requests(recipient_id, status, created_at desc);

create index if not exists chat_requests_requester_status_idx
on public.chat_requests(requester_id, status, created_at desc);

alter table public.chat_requests enable row level security;

drop policy if exists "Participants read their chat requests" on public.chat_requests;
create policy "Participants read their chat requests"
on public.chat_requests for select
to authenticated
using (requester_id = (select auth.uid()) or recipient_id = (select auth.uid()));

drop policy if exists "Users create own pending chat requests" on public.chat_requests;
create policy "Users create own pending chat requests"
on public.chat_requests for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and status = 'pending'
  and requester_id <> recipient_id
);

drop policy if exists "Recipients respond to chat requests" on public.chat_requests;
create policy "Recipients respond to chat requests"
on public.chat_requests for update
to authenticated
using (recipient_id = (select auth.uid()) and status = 'pending')
with check (
  recipient_id = (select auth.uid())
  and status in ('accepted', 'rejected')
);

grant select, insert, update on public.chat_requests to authenticated;

create or replace function public.can_read_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      auth.uid() = target_profile_id
      or exists (
        select 1
        from public.conversation_participants mine
        join public.conversation_participants peer
          on peer.conversation_id = mine.conversation_id
        where mine.profile_id = auth.uid()
          and peer.profile_id = target_profile_id
      )
      or exists (
        select 1
        from public.chat_requests cr
        where (
          cr.requester_id = auth.uid()
          and cr.recipient_id = target_profile_id
        )
        or (
          cr.recipient_id = auth.uid()
          and cr.requester_id = target_profile_id
        )
      )
    );
$$;

create or replace function public.find_direct_conversation_between(p_user_a uuid, p_user_b uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cp1.conversation_id
  from public.conversation_participants cp1
  join public.conversation_participants cp2 on cp2.conversation_id = cp1.conversation_id
  join public.conversations c on c.id = cp1.conversation_id
  where c.type::text = 'direct'
    and cp1.profile_id = p_user_a
    and cp2.profile_id = p_user_b
  limit 1;
$$;

revoke all on function public.find_direct_conversation_between(uuid, uuid) from public;
grant execute on function public.find_direct_conversation_between(uuid, uuid) to authenticated;

create or replace function public.request_direct_conversation_by_username(peer_username text)
returns table (
  request_id uuid,
  status text,
  conversation_id uuid,
  peer_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_username text;
  found_peer_id uuid;
  existing_conversation_id uuid;
  existing_request public.chat_requests%rowtype;
  new_request_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  normalized_username := lower(regexp_replace(coalesce(trim(peer_username), ''), '[^a-z0-9_]', '', 'g'));

  if normalized_username = '' then
    raise exception 'invalid username';
  end if;

  select p.id
  into found_peer_id
  from public.profiles p
  where p.username = normalized_username
    and p.id <> current_user_id
  limit 1;

  if found_peer_id is null then
    raise exception 'peer not found';
  end if;

  if public.users_blocked_either_way(current_user_id, found_peer_id) then
    raise exception 'conversation blocked';
  end if;

  existing_conversation_id := public.find_direct_conversation_between(current_user_id, found_peer_id);

  if existing_conversation_id is not null then
    return query select null::uuid, 'accepted'::text, existing_conversation_id, found_peer_id;
    return;
  end if;

  select *
  into existing_request
  from public.chat_requests cr
  where cr.status = 'pending'
    and (
      (cr.requester_id = current_user_id and cr.recipient_id = found_peer_id)
      or (cr.requester_id = found_peer_id and cr.recipient_id = current_user_id)
    )
  order by cr.created_at desc
  limit 1;

  if existing_request.id is not null then
    return query select existing_request.id, existing_request.status, existing_request.conversation_id, found_peer_id;
    return;
  end if;

  insert into public.chat_requests(requester_id, recipient_id)
  values (current_user_id, found_peer_id)
  returning id into new_request_id;

  return query select new_request_id, 'pending'::text, null::uuid, found_peer_id;
end;
$$;

grant execute on function public.request_direct_conversation_by_username(text) to authenticated;

create or replace function public.create_direct_conversation(peer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_conversation_id uuid;
  pending_request_id uuid;
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

  if public.users_blocked_either_way(current_user_id, peer_id) then
    raise exception 'conversation blocked';
  end if;

  existing_conversation_id := public.find_direct_conversation_between(current_user_id, peer_id);

  if existing_conversation_id is not null then
    return existing_conversation_id;
  end if;

  select cr.id
  into pending_request_id
  from public.chat_requests cr
  where cr.status = 'pending'
    and (
      (cr.requester_id = current_user_id and cr.recipient_id = peer_id)
      or (cr.requester_id = peer_id and cr.recipient_id = current_user_id)
    )
  limit 1;

  if pending_request_id is null then
    insert into public.chat_requests(requester_id, recipient_id)
    values (current_user_id, peer_id)
    returning id into pending_request_id;
  end if;

  raise exception 'chat request pending';
end;
$$;

grant execute on function public.create_direct_conversation(uuid) to authenticated;

create or replace function public.create_direct_conversation_v2(peer_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.create_direct_conversation(peer_id);
end;
$$;

grant execute on function public.create_direct_conversation_v2(uuid) to authenticated;

create or replace function public.accept_chat_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_record public.chat_requests%rowtype;
  existing_conversation_id uuid;
  new_conversation_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  select *
  into request_record
  from public.chat_requests cr
  where cr.id = p_request_id
  for update;

  if request_record.id is null then
    raise exception 'chat request not found';
  end if;

  if request_record.recipient_id <> current_user_id then
    raise exception 'only recipient can accept request';
  end if;

  if request_record.status <> 'pending' then
    if request_record.status = 'accepted' and request_record.conversation_id is not null then
      return request_record.conversation_id;
    end if;
    raise exception 'chat request is not pending';
  end if;

  if public.users_blocked_either_way(request_record.requester_id, request_record.recipient_id) then
    raise exception 'conversation blocked';
  end if;

  existing_conversation_id := public.find_direct_conversation_between(request_record.requester_id, request_record.recipient_id);

  if existing_conversation_id is null then
    insert into public.conversations(type, created_by, encryption_version)
    values ('direct', request_record.requester_id, 'device-envelope-v1')
    returning id into new_conversation_id;

    insert into public.conversation_participants(conversation_id, profile_id)
    values
      (new_conversation_id, request_record.requester_id),
      (new_conversation_id, request_record.recipient_id)
    on conflict do nothing;

    insert into public.conversation_members(conversation_id, user_id, role)
    values
      (new_conversation_id, request_record.requester_id, 'owner'),
      (new_conversation_id, request_record.recipient_id, 'member')
    on conflict (conversation_id, user_id) do nothing;
  else
    new_conversation_id := existing_conversation_id;
  end if;

  update public.chat_requests
  set
    status = 'accepted',
    conversation_id = new_conversation_id,
    responded_at = now()
  where id = p_request_id;

  return new_conversation_id;
end;
$$;

grant execute on function public.accept_chat_request(uuid) to authenticated;

create or replace function public.reject_chat_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  request_record public.chat_requests%rowtype;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  select *
  into request_record
  from public.chat_requests cr
  where cr.id = p_request_id
  for update;

  if request_record.id is null then
    raise exception 'chat request not found';
  end if;

  if request_record.recipient_id <> current_user_id then
    raise exception 'only recipient can reject request';
  end if;

  if request_record.status <> 'pending' then
    raise exception 'chat request is not pending';
  end if;

  update public.chat_requests
  set
    status = 'rejected',
    responded_at = now()
  where id = p_request_id;

  return p_request_id;
end;
$$;

grant execute on function public.reject_chat_request(uuid) to authenticated;

create or replace function public.list_chat_requests()
returns table (
  id uuid,
  direction text,
  status text,
  conversation_id uuid,
  created_at timestamptz,
  responded_at timestamptz,
  peer_id uuid,
  peer_username text,
  peer_avatar_url text,
  peer_push_token text,
  peer_e2ee_public_key text,
  peer_online_at timestamptz,
  peer_created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cr.id,
    case when cr.recipient_id = auth.uid() then 'inbound' else 'outbound' end as direction,
    cr.status,
    cr.conversation_id,
    cr.created_at,
    cr.responded_at,
    peer.id as peer_id,
    peer.username as peer_username,
    peer.avatar_url as peer_avatar_url,
    peer.push_token as peer_push_token,
    peer.e2ee_public_key as peer_e2ee_public_key,
    peer.online_at as peer_online_at,
    peer.created_at as peer_created_at
  from public.chat_requests cr
  join public.profiles peer
    on peer.id = case when cr.recipient_id = auth.uid() then cr.requester_id else cr.recipient_id end
  where auth.uid() is not null
    and (cr.requester_id = auth.uid() or cr.recipient_id = auth.uid())
    and (
      cr.status = 'pending'
      or (cr.status = 'rejected' and cr.requester_id = auth.uid() and cr.responded_at > now() - interval '7 days')
    )
  order by cr.created_at desc;
$$;

grant execute on function public.list_chat_requests() to authenticated;

create or replace function public.create_direct_conversation_by_username(peer_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result_record record;
begin
  select *
  into result_record
  from public.request_direct_conversation_by_username(peer_username)
  limit 1;

  if result_record.status = 'accepted' and result_record.conversation_id is not null then
    return result_record.conversation_id;
  end if;

  raise exception 'chat request pending';
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.chat_requests;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
