create or replace function public.destroy_conversation_for_everyone(p_conversation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  current_user_id uuid := auth.uid();
  target_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  select c.id
  into target_id
  from public.conversations c
  where c.id = p_conversation_id
    and public.is_conversation_member_v2(c.id, current_user_id)
  limit 1;

  if target_id is null then
    raise exception 'conversation not found or access denied';
  end if;

  insert into public.security_audit_events(actor_id, conversation_id, event_type, metadata)
  values (current_user_id, target_id, 'destroy_conversation_requested', '{}'::jsonb);

  delete from storage.objects
  where bucket_id = 'chat-attachments'
    and (storage.foldername(name))[1] = target_id::text;

  delete from public.chat_requests
  where conversation_id = target_id;

  delete from public.conversations
  where id = target_id;

  insert into public.security_audit_events(actor_id, conversation_id, event_type, metadata)
  values (current_user_id, null, 'destroy_conversation_completed', jsonb_build_object('conversation_id', target_id));

  return target_id;
end;
$$;

revoke all on function public.destroy_conversation_for_everyone(uuid) from public;
grant execute on function public.destroy_conversation_for_everyone(uuid) to authenticated;
