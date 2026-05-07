-- Remove the unused Shield verification table scaffold.
--
-- The current app and API documentation do not read or write
-- public.shield_device_verifications. Keep the Shield columns on devices,
-- prekeys, and encrypted_messages because they are non-breaking contract fields
-- for the future provider rollout, but remove the unused standalone table.
--
-- Do not drop public.messages or public.conversation_participants here:
-- both are still used by the client, RPCs, realtime subscriptions, and tests.

do $$
begin
  if to_regclass('public.shield_device_verifications') is not null then
    drop policy if exists "Verified users can see verification records about their devices"
    on public.shield_device_verifications;

    drop policy if exists "Users manage their Shield device verifications"
    on public.shield_device_verifications;

    drop index if exists public.shield_device_verifications_verified_device_idx;

    drop table public.shield_device_verifications;
  end if;
end $$;

-- Useful for fetchDeviceMessages(conversationId, currentDeviceId), which filters
-- by both columns and sorts newest-first before reversing in the client.
create index if not exists encrypted_messages_conversation_recipient_created_idx
on public.encrypted_messages(conversation_id, recipient_device_id, created_at desc);
