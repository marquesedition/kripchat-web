# KripChat Security

KripChat is designed so Supabase transports and stores ciphertext, not message plaintext.

## What KripChat Protects

- Message bodies are encrypted on the client before being inserted.
- The new `encrypted_messages` model stores one ciphertext per recipient device.
- Device private keys stay on the device through `expo-secure-store` helpers.
- Public identity keys, signed prekeys, and one-time prekeys are the only key material stored in Supabase.
- Public profiles do not expose email or phone numbers.
- Read receipts are configurable per conversation member.
- Blocking is enforced in the client service and prepared in RLS/RPC checks.

## Current Limits

- `localCryptoProvider` is a development placeholder using TweetNaCl boxes.
- It is not a complete Signal Protocol implementation.
- It does not yet provide full X3DH, Double Ratchet, post-compromise security, deniability, or production-grade multi-device session management.
- Existing UI screens still use the legacy chat store while the new per-device Supabase layer is staged under `src/lib`.
- Push notification bodies must remain generic and must not contain plaintext previews.

## Visible Metadata

Supabase can still observe:

- auth user ids
- usernames and public profile fields
- device ids and public key bundles
- conversation membership
- sender and recipient user/device ids
- message timestamps
- delivery/read timestamps when enabled
- encrypted attachment path, file type, and file size
- block relationships for the blocking user

## Not Yet Protected

- Traffic analysis
- Social graph inference from conversation membership
- Timing correlation
- Compromised client devices
- Malicious screenshots or OS-level key extraction
- Full private group metadata

## Production Plan

Before production security claims:

1. Replace `localCryptoProvider` with an audited Signal Protocol implementation.
2. Add formal device verification and safety number UX.
3. Add key rotation, revocation recovery, and stale-device handling.
4. Add encrypted group sender keys or equivalent audited group protocol.
5. Make attachment metadata less revealing where possible.
6. Run independent security review of RLS policies, storage policies, and client crypto boundaries.

Do not market the current placeholder crypto as production-ready end-to-end encryption.
