create schema if not exists private;

alter table public.conversations
  add column if not exists high_risk_enabled boolean not null default false,
  add column if not exists crypto_epoch integer not null default 1,
  add column if not exists crypto_destroyed_at timestamptz;

create table if not exists public.security_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z0-9_]{3,64}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_audit_events_actor_created_idx
on public.security_audit_events(actor_id, created_at desc);

create index if not exists security_audit_events_conversation_created_idx
on public.security_audit_events(conversation_id, created_at desc);

alter table public.security_audit_events enable row level security;

create policy "Users write their own security audit events"
on public.security_audit_events for insert
to authenticated
with check ((select auth.uid()) = actor_id);

create policy "Users read their own security audit events"
on public.security_audit_events for select
to authenticated
using ((select auth.uid()) = actor_id);

create policy "Conversation members read conversation audit events"
on public.security_audit_events for select
to authenticated
using (
  conversation_id is not null
  and public.is_conversation_member(conversation_id, (select auth.uid()))
);

create or replace function public.set_conversation_high_risk(
  p_conversation_id uuid,
  p_enabled boolean
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.conversations
  set
    high_risk_enabled = p_enabled,
    crypto_epoch = case when p_enabled then crypto_epoch + 1 else crypto_epoch end,
    updated_at = now()
  where id = p_conversation_id;

  if not found then
    raise exception 'conversation not found or access denied';
  end if;

  insert into public.security_audit_events(actor_id, conversation_id, event_type, metadata)
  values (
    auth.uid(),
    p_conversation_id,
    case when p_enabled then 'high_risk_enabled' else 'high_risk_disabled' end,
    jsonb_build_object('enabled', p_enabled)
  );
end;
$$;

grant execute on function public.set_conversation_high_risk(uuid, boolean) to authenticated;

create or replace function private.destroy_expired_conversations()
returns integer
language plpgsql
security definer
set search_path = public, private
as $$
declare
  deleted_count integer := 0;
begin
  with expired as (
    select id
    from public.conversations
    where auto_destroy_at is not null
      and auto_destroy_at <= now()
  ),
  audit_rows as (
    insert into public.security_audit_events(actor_id, conversation_id, event_type, metadata)
    select cp.profile_id, expired.id, 'auto_destroy_executed', '{}'::jsonb
    from expired
    join public.conversation_participants cp on cp.conversation_id = expired.id
    returning 1
  ),
  deleted as (
    delete from public.conversations c
    using expired
    where c.id = expired.id
    returning c.id
  )
  select count(*) into deleted_count from deleted;

  return deleted_count;
end;
$$;

revoke all on function private.destroy_expired_conversations() from public;
revoke all on function private.destroy_expired_conversations() from anon;
revoke all on function private.destroy_expired_conversations() from authenticated;

create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'kripchat-destroy-expired-conversations',
  '* * * * *',
  $$select private.destroy_expired_conversations();$$
);

create or replace function public.list_chat_previews()
returns table (
  conversation_id uuid,
  conversation_type public.conversation_type,
  conversation_created_at timestamptz,
  conversation_updated_at timestamptz,
  conversation_auto_destroy_seconds integer,
  conversation_auto_destroy_at timestamptz,
  conversation_high_risk_enabled boolean,
  conversation_crypto_epoch integer,
  conversation_crypto_destroyed_at timestamptz,
  peer_id uuid,
  peer_username text,
  peer_avatar_url text,
  peer_push_token text,
  peer_e2ee_public_key text,
  peer_online_at timestamptz,
  peer_created_at timestamptz,
  last_message_id uuid,
  last_message_sender_id uuid,
  last_message_body text,
  last_message_client_id text,
  last_message_status public.message_status,
  last_message_kind text,
  last_message_attachment_path text,
  last_message_attachment_name text,
  last_message_attachment_mime text,
  last_message_attachment_size bigint,
  last_message_location_lat double precision,
  last_message_location_lng double precision,
  last_message_location_label text,
  last_message_created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id as conversation_id,
    c.type as conversation_type,
    c.created_at as conversation_created_at,
    c.updated_at as conversation_updated_at,
    c.auto_destroy_seconds as conversation_auto_destroy_seconds,
    c.auto_destroy_at as conversation_auto_destroy_at,
    c.high_risk_enabled as conversation_high_risk_enabled,
    c.crypto_epoch as conversation_crypto_epoch,
    c.crypto_destroyed_at as conversation_crypto_destroyed_at,
    peer.id as peer_id,
    peer.username as peer_username,
    peer.avatar_url as peer_avatar_url,
    peer.push_token as peer_push_token,
    peer.e2ee_public_key as peer_e2ee_public_key,
    peer.online_at as peer_online_at,
    peer.created_at as peer_created_at,
    last_message.id as last_message_id,
    last_message.sender_id as last_message_sender_id,
    last_message.body as last_message_body,
    last_message.client_id as last_message_client_id,
    last_message.status as last_message_status,
    last_message.kind::text as last_message_kind,
    last_message.attachment_path as last_message_attachment_path,
    last_message.attachment_name as last_message_attachment_name,
    last_message.attachment_mime as last_message_attachment_mime,
    last_message.attachment_size::bigint as last_message_attachment_size,
    last_message.location_lat as last_message_location_lat,
    last_message.location_lng as last_message_location_lng,
    last_message.location_label as last_message_location_label,
    last_message.created_at as last_message_created_at
  from public.conversation_participants mine
  join public.conversations c on c.id = mine.conversation_id
  join lateral (
    select p.*
    from public.conversation_participants cp
    join public.profiles p on p.id = cp.profile_id
    where cp.conversation_id = c.id
      and cp.profile_id <> auth.uid()
    limit 1
  ) as peer on true
  left join lateral (
    select m.*
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) as last_message on true
  where mine.profile_id = auth.uid()
  order by c.updated_at desc;
$$;
