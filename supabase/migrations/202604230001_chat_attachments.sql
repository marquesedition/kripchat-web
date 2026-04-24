create type public.message_kind as enum ('text', 'image', 'video', 'audio', 'document', 'location');

alter table public.messages
  add column kind public.message_kind not null default 'text',
  add column attachment_path text,
  add column attachment_name text,
  add column attachment_mime text,
  add column attachment_size bigint,
  add column location_lat double precision,
  add column location_lng double precision,
  add column location_label text;

alter table public.messages
  drop constraint messages_body_check,
  add constraint messages_body_check check (
    length(trim(body)) between 1 and 2000
    or kind in ('image', 'video', 'audio', 'document', 'location')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-attachments',
  'chat-attachments',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'video/mp4',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'application/pdf',
    'application/octet-stream',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Members upload chat attachments"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-attachments'
  and public.is_conversation_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
);

create policy "Members read chat attachments"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-attachments'
  and public.is_conversation_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
);

create policy "Upload owners update chat attachments"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chat-attachments'
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id = 'chat-attachments'
  and public.is_conversation_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
);
