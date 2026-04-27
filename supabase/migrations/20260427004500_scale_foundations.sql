create index if not exists conversations_updated_at_desc_idx
on public.conversations(updated_at desc);

create index if not exists profiles_online_at_idx
on public.profiles(online_at desc);

create index if not exists messages_created_at_brin_idx
on public.messages using brin(created_at);

create or replace function public.list_chat_previews()
returns table (
  conversation_id uuid,
  conversation_type public.conversation_type,
  conversation_created_at timestamptz,
  conversation_updated_at timestamptz,
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

grant execute on function public.list_chat_previews() to authenticated;
