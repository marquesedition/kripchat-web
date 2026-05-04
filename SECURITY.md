# KripChat Security

KripChat is designed so Supabase transports and stores ciphertext, not message plaintext.

For the full code-level explanation, read [`docs/security-model.md`](docs/security-model.md). The next-generation Shield plan is documented in [`docs/kripchat-shield-protocol.md`](docs/kripchat-shield-protocol.md).

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
- Web key storage uses AsyncStorage and is weaker than native `expo-secure-store`.
- Legacy `messages` support still exists for compatibility and should be retired or migrated before stronger production claims.
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
7. Remove or migrate legacy `messages` storage.

Do not market the current placeholder crypto as production-ready end-to-end encryption.
