insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'encrypted-media',
  'encrypted-media',
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

drop policy if exists "Members upload encrypted media" on storage.objects;
create policy "Members upload encrypted media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'encrypted-media'
  and public.is_conversation_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
);

drop policy if exists "Members read encrypted media" on storage.objects;
create policy "Members read encrypted media"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'encrypted-media'
  and public.is_conversation_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
);

drop policy if exists "Upload owners update encrypted media" on storage.objects;
create policy "Upload owners update encrypted media"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'encrypted-media'
  and owner_id = (select auth.uid())::text
)
with check (
  bucket_id = 'encrypted-media'
  and public.is_conversation_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
);

drop policy if exists "Members delete encrypted media" on storage.objects;
create policy "Members delete encrypted media"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'encrypted-media'
  and public.is_conversation_member(((storage.foldername(name))[1])::uuid, (select auth.uid()))
);
