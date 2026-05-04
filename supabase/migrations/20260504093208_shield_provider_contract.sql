alter table public.devices
  add column if not exists shield_protocol_version int not null default 1,
  add column if not exists shield_provider_id text,
  add column if not exists identity_fingerprint text,
  add column if not exists signed_prekey_id text,
  add column if not exists signed_prekey_signature text,
  add column if not exists pq_kem_prekey_id text,
  add column if not exists public_pq_kem_prekey text,
  add column if not exists shield_verified_at timestamptz;

alter table public.prekeys
  add column if not exists key_algorithm text not null default 'x25519',
  add column if not exists public_pq_kem_prekey text;

alter table public.encrypted_messages
  add column if not exists shield_session_id text,
  add column if not exists shield_ratchet_epoch int,
  add column if not exists shield_message_number int,
  add column if not exists shield_provider_id text;

create table if not exists public.shield_device_verifications (
  verifier_user_id uuid not null references public.profiles(id) on delete cascade,
  verified_user_id uuid not null references public.profiles(id) on delete cascade,
  verified_device_id uuid not null references public.devices(id) on delete cascade,
  identity_fingerprint text not null,
  verification_method text not null default 'manual' check (verification_method in ('manual', 'safety_number', 'admin')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (verifier_user_id, verified_device_id)
);

create index if not exists devices_shield_fingerprint_idx
  on public.devices(user_id, identity_fingerprint)
  where revoked_at is null and identity_fingerprint is not null;

create index if not exists prekeys_algorithm_unused_idx
  on public.prekeys(device_id, key_algorithm, used_at)
  where used_at is null;

create index if not exists encrypted_messages_shield_session_idx
  on public.encrypted_messages(shield_session_id, shield_ratchet_epoch, shield_message_number)
  where shield_session_id is not null;

create index if not exists shield_device_verifications_verified_device_idx
  on public.shield_device_verifications(verified_device_id, revoked_at);

alter table public.shield_device_verifications enable row level security;

create policy "Users manage their Shield device verifications"
on public.shield_device_verifications for all
to authenticated
using ((select auth.uid()) = verifier_user_id)
with check ((select auth.uid()) = verifier_user_id);

create policy "Verified users can see verification records about their devices"
on public.shield_device_verifications for select
to authenticated
using ((select auth.uid()) = verified_user_id);
