-- Restrict profile reads to self + direct conversation peers.
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
    );
$$;

grant execute on function public.can_read_profile(uuid) to authenticated;

drop policy if exists "Profiles are readable by signed in users" on public.profiles;

drop policy if exists "Profiles are readable by conversation peers" on public.profiles;

create policy "Profiles are readable by conversation peers"
on public.profiles for select
to authenticated
using (public.can_read_profile(id));

-- Allow opening a direct conversation by username without exposing global profile reads.
create or replace function public.create_direct_conversation_by_username(peer_username text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_username text;
  peer_id uuid;
begin
  if current_user_id is null then
    raise exception 'not authenticated';
  end if;

  normalized_username := lower(regexp_replace(coalesce(trim(peer_username), ''), '[^a-z0-9_]', '', 'g'));

  if normalized_username = '' then
    raise exception 'invalid username';
  end if;

  select p.id
  into peer_id
  from public.profiles p
  where p.username = normalized_username
    and p.id <> current_user_id
  limit 1;

  if peer_id is null then
    raise exception 'peer not found';
  end if;

  return public.create_direct_conversation(peer_id);
end;
$$;

grant execute on function public.create_direct_conversation_by_username(text) to authenticated;
