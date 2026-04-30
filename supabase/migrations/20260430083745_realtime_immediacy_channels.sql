do $$
begin
  alter table public.conversations replica identity full;
  alter table public.conversation_participants replica identity full;
  alter table public.messages replica identity full;
  alter table public.chat_requests replica identity full;
  alter table public.encrypted_messages replica identity full;
exception
  when undefined_table then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversation_participants;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.chat_requests;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.encrypted_messages;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
