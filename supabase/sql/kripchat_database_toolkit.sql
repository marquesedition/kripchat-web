-- KripChat database toolkit
-- Run section by section in Supabase SQL Editor or with:
-- npx supabase db query --db-url "$SUPABASE_DB_URL" -f supabase/sql/kripchat_database_toolkit.sql
--
-- The file is safe to run end-to-end by default. Statements that change data
-- are grouped near the end inside block comments. Review counts, uncomment the
-- specific statement you want, and execute only that statement.

-- ---------------------------------------------------------------------------
-- 01. Schema inventory
-- ---------------------------------------------------------------------------

select
  n.nspname as schema_name,
  c.relname as object_name,
  case c.relkind
    when 'r' then 'table'
    when 'p' then 'partitioned table'
    when 'v' then 'view'
    when 'm' then 'materialized view'
    when 'i' then 'index'
    when 'S' then 'sequence'
    else c.relkind::text
  end as object_type,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size,
  coalesce(s.n_live_tup, 0) as estimated_live_rows,
  coalesce(s.n_dead_tup, 0) as estimated_dead_rows
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_stat_user_tables s on s.relid = c.oid
where n.nspname in ('public', 'storage')
  and c.relkind in ('r', 'p', 'v', 'm', 'i', 'S')
order by pg_total_relation_size(c.oid) desc, n.nspname, c.relname;

select
  table_schema,
  table_name,
  column_name,
  ordinal_position,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema in ('public', 'storage')
order by table_schema, table_name, ordinal_position;

select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname in ('public', 'storage')
order by schemaname, tablename, indexname;

-- ---------------------------------------------------------------------------
-- 02. RLS, grants, functions, and realtime exposure
-- ---------------------------------------------------------------------------

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
order by c.relname;

select
  grantee,
  table_schema,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema in ('public', 'storage')
  and grantee in ('anon', 'authenticated')
order by table_schema, table_name, grantee, privilege_type;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  case p.prosecdef when true then 'security definer' else 'security invoker' end as security_mode
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
order by n.nspname, p.proname, arguments;

select
  pubname,
  schemaname,
  tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;

-- ---------------------------------------------------------------------------
-- 03. Product use-case views as SQL
-- ---------------------------------------------------------------------------

-- Replace the null values in params when investigating one user or conversation.
with params as (
  select
    null::uuid as user_id,
    null::uuid as conversation_id
)
select
  p.id,
  p.username,
  p.display_name,
  p.online_at,
  p.created_at,
  count(distinct d.id) filter (where d.revoked_at is null) as active_devices,
  count(distinct pk.id) filter (where pk.used_at is null) as unused_prekeys
from public.profiles p
left join public.devices d on d.user_id = p.id
left join public.prekeys pk on pk.device_id = d.id
cross join params
where params.user_id is null or p.id = params.user_id
group by p.id, p.username, p.display_name, p.online_at, p.created_at
order by p.created_at desc;

with params as (
  select null::uuid as user_id
)
select
  cr.id,
  cr.status,
  cr.requester_id,
  requester.username as requester_username,
  cr.recipient_id,
  recipient.username as recipient_username,
  cr.conversation_id,
  cr.created_at,
  cr.responded_at
from public.chat_requests cr
join public.profiles requester on requester.id = cr.requester_id
join public.profiles recipient on recipient.id = cr.recipient_id
cross join params
where params.user_id is null
  or params.user_id in (cr.requester_id, cr.recipient_id)
order by cr.created_at desc;

with params as (
  select null::uuid as conversation_id
)
select
  c.id as conversation_id,
  c.type,
  c.created_at,
  c.updated_at,
  c.auto_destroy_seconds,
  c.auto_destroy_at,
  c.high_risk_enabled,
  c.crypto_epoch,
  count(distinct cm.user_id) filter (where cm.left_at is null) as active_members,
  count(distinct em.id) as encrypted_message_rows,
  count(distinct m.id) as legacy_message_rows
from public.conversations c
left join public.conversation_members cm on cm.conversation_id = c.id
left join public.encrypted_messages em on em.conversation_id = c.id
left join public.messages m on m.conversation_id = c.id
cross join params
where params.conversation_id is null or c.id = params.conversation_id
group by c.id, c.type, c.created_at, c.updated_at, c.auto_destroy_seconds,
  c.auto_destroy_at, c.high_risk_enabled, c.crypto_epoch
order by c.updated_at desc;

with params as (
  select null::uuid as conversation_id
)
select
  em.conversation_id,
  em.id as encrypted_message_id,
  sender.username as sender_username,
  em.sender_device_id,
  recipient.username as recipient_username,
  em.recipient_device_id,
  em.message_type,
  em.created_at,
  em.delivered_at,
  em.read_at,
  em.deleted_for_all_at,
  length(em.ciphertext) as ciphertext_bytes,
  em.file_type,
  em.file_size
from public.encrypted_messages em
join public.profiles sender on sender.id = em.sender_user_id
join public.profiles recipient on recipient.id = em.recipient_user_id
cross join params
where params.conversation_id is null or em.conversation_id = params.conversation_id
order by em.created_at desc
limit 200;

select
  bucket_id,
  split_part(name, '/', 1)::uuid as conversation_id,
  count(*) as object_count,
  pg_size_pretty(coalesce(sum((metadata->>'size')::bigint), 0)::bigint) as total_size
from storage.objects
where bucket_id = 'chat-attachments'
  and name ~ '^[0-9a-f-]{36}/'
group by bucket_id, split_part(name, '/', 1)
order by object_count desc;

select
  event_type,
  count(*) as events,
  min(created_at) as first_seen_at,
  max(created_at) as last_seen_at
from public.security_audit_events
group by event_type
order by last_seen_at desc;

-- ---------------------------------------------------------------------------
-- 04. Data quality checks
-- ---------------------------------------------------------------------------

select d.*
from public.devices d
left join public.profiles p on p.id = d.user_id
where p.id is null;

select pk.*
from public.prekeys pk
left join public.devices d on d.id = pk.device_id
where d.id is null;

select cm.*
from public.conversation_members cm
left join public.conversations c on c.id = cm.conversation_id
left join public.profiles p on p.id = cm.user_id
where c.id is null or p.id is null;

select cp.*
from public.conversation_participants cp
left join public.conversation_members cm
  on cm.conversation_id = cp.conversation_id
 and cm.user_id = cp.profile_id
where cm.conversation_id is null;

select cm.*
from public.conversation_members cm
left join public.conversation_participants cp
  on cp.conversation_id = cm.conversation_id
 and cp.profile_id = cm.user_id
where cp.conversation_id is null
  and cm.left_at is null;

select c.id, c.type, c.created_at, c.updated_at, count(cm.user_id) as active_members
from public.conversations c
left join public.conversation_members cm
  on cm.conversation_id = c.id
 and cm.left_at is null
group by c.id, c.type, c.created_at, c.updated_at
having count(cm.user_id) < 2
order by c.updated_at desc;

select em.*
from public.encrypted_messages em
left join public.devices recipient_device on recipient_device.id = em.recipient_device_id
where recipient_device.id is null
  or recipient_device.revoked_at is not null;

select em.*
from public.encrypted_messages em
where not exists (
  select 1
  from public.conversation_members cm
  where cm.conversation_id = em.conversation_id
    and cm.user_id = em.sender_user_id
    and cm.left_at is null
)
or not exists (
  select 1
  from public.conversation_members cm
  where cm.conversation_id = em.conversation_id
    and cm.user_id = em.recipient_user_id
    and cm.left_at is null
);

select cr.*
from public.chat_requests cr
where cr.status = 'accepted'
  and cr.conversation_id is null;

select cr.*
from public.chat_requests cr
where cr.status = 'pending'
  and cr.created_at < now() - interval '30 days'
order by cr.created_at;

-- ---------------------------------------------------------------------------
-- 05. Safe maintenance / backfill statements
-- ---------------------------------------------------------------------------

/*
insert into public.conversation_members (conversation_id, user_id, role, joined_at)
select cp.conversation_id, cp.profile_id, 'member', cp.created_at
from public.conversation_participants cp
left join public.conversation_members cm
  on cm.conversation_id = cp.conversation_id
 and cm.user_id = cp.profile_id
where cm.conversation_id is null
on conflict (conversation_id, user_id) do nothing;
*/

/*
update public.conversations c
set last_message_at = latest.created_at,
    updated_at = greatest(c.updated_at, latest.created_at)
from (
  select conversation_id, max(created_at) as created_at
  from public.encrypted_messages
  group by conversation_id
) latest
where latest.conversation_id = c.id
  and (c.last_message_at is null or c.last_message_at < latest.created_at);
*/

/*
delete from public.chat_requests
where status = 'rejected'
  and responded_at < now() - interval '30 days';
*/

/*
delete from public.prekeys
where used_at is not null
  and used_at < now() - interval '90 days';
*/

-- ---------------------------------------------------------------------------
-- 06. Retirement checks before dropping legacy tables
-- ---------------------------------------------------------------------------

-- public.messages is legacy but still used by the current client as fallback.
-- It is safe to drop only after these counts are zero and the app/RPC code no
-- longer references from("messages"), list_chat_previews legacy fields, or
-- realtime table "messages".
select count(*) as legacy_message_rows from public.messages;

-- public.conversation_participants is legacy but still used by current RPCs,
-- realtime inbox refresh, peer lookup, and tests. It is safe to drop only after
-- those paths are migrated to public.conversation_members.
select count(*) as legacy_participant_rows from public.conversation_participants;

-- Candidate drop sequence for a future migration, not for today:
-- drop trigger if exists sync_conversation_members_from_participants on public.conversation_participants;
-- drop trigger if exists messages_touch_conversation on public.messages;
-- drop table if exists public.messages;
-- drop table if exists public.conversation_participants;
