# KripChat Shield Protocol

KripChat Shield is the next encryption architecture for KripChat. It is designed to run beside the current app until it is ready to become the default.

Important: Shield must not invent custom cryptographic primitives. The product can be ours, the protocol composition can be ours, and the UX can be stronger than normal chat products, but the math must come from audited primitives and reviewed implementations.

## Product Goal

Build a top-tier private operations messenger with:

- device-first encrypted delivery
- one ciphertext envelope per recipient device
- forward secrecy
- post-compromise recovery
- hybrid post-quantum session setup
- generic push notifications
- metadata minimization
- enterprise controls such as remote device lock, namespaces, and non-sensitive audit events

## Runtime Modes

KripChat can run the old and new app at the same time.

The current production stack remains:

```text
EXPO_PUBLIC_KRIPCHAT_APP_MODE=classic
EXPO_PUBLIC_KRIPCHAT_CRYPTO_STACK=legacy-device-envelope-v1
```

The new stack will be activated only when the provider is ready:

```text
EXPO_PUBLIC_KRIPCHAT_APP_MODE=shield
EXPO_PUBLIC_KRIPCHAT_CRYPTO_STACK=kripchat-shield-v1
```

This gives us three safe rollout options:

1. Classic app for production users.
2. Shield app for internal testing, beta users, or a separate build.
3. Dual-read compatibility while old conversations are migrated.

## How Two Apps Can Coexist

There are two practical approaches.

### Option A: One Repo, Two Builds

Use the same Expo app and switch behavior by environment variables.

- Classic build uses the current UI/routes and legacy crypto stack.
- Shield build uses the new Shield screens, stricter UX, and Shield crypto stack.
- Both can share Supabase Auth, profiles, devices, and conversations.
- Message rows stay versioned through `conversations.encryption_version` and `encrypted_messages.crypto_metadata.algorithm`.

This is the best option now because it avoids maintaining two repos.

### Option B: Two Apps, Shared Backend

Create a second Expo app/package later if the Shield experience becomes very different.

- `kripchat` stays stable.
- `kripchat-shield` becomes the high-security client.
- Both use the same Supabase project at first.
- Enterprise/Ops can later move to a dedicated Supabase project.

This is stronger for branding and risk isolation, but it costs more.

## Protocol Shape

Shield v1 should use:

- `X25519` for classical ECDH
- `ML-KEM-768` for post-quantum hybrid key exchange
- `HKDF-SHA256` for key derivation
- `Double Ratchet` style per-device session updates
- `Ed25519` signatures for signed prekeys and safety fingerprints
- `XChaCha20-Poly1305` or `AES-256-GCM` for message encryption
- fixed-size padding buckets for message size minimization

The current foundation lives in:

- `src/lib/shield/config.ts`
- `src/lib/shield/ShieldCryptoProvider.ts`
- `src/lib/shield/providerRegistry.ts`
- `src/lib/shield/protocol.ts`
- `src/lib/shield/sessionStore.ts`
- `src/lib/shield/types.ts`

Shield is provider-driven. The app can select the `kripchat-shield-v1` stack, but message sending must fail closed until a production-ready provider is registered with `registerShieldCryptoProvider`.

## Data Model Direction

The existing tables already give us a useful base:

- `devices`
- `prekeys`
- `encrypted_messages`
- `conversation_members`
- `security_audit_events`

Before full Shield activation, add or extend schema for:

- device identity fingerprints
- signed prekey signatures
- PQ KEM prekeys
- one-time prekey consumption with transactional locking
- local session state version references
- device verification status
- recovery and revocation events

Do not enforce Shield only in the UI. Real enforcement needs database columns, RLS checks, and client guards.

The first Shield schema preparation is in `supabase/migrations/20260504093208_shield_provider_contract.sql`.

## Rollout Plan

1. Add Shield foundation, config flags, docs, and tests.
2. Add Supabase migration for Shield key metadata and device verification.
3. Build local Shield session store.
4. Integrate a real crypto provider.
5. Send duplicate test messages into isolated Shield conversations.
6. Add device verification / safety number UX.
7. Migrate selected beta users.
8. Make Shield the default only after decrypt/replay/prekey/device-loss tests pass.

## Security Claims

Safe now:

- "KripChat is preparing a hardened Shield encryption architecture."
- "Shield is designed for hybrid post-quantum session setup."
- "Shield will use audited primitives and versioned message envelopes."

Not safe yet:

- "Shield is audited."
- "Shield is stronger than Signal."
- "Shield cannot be broken."
- "Shield is production-ready."

The strongest honest claim later is:

> KripChat Shield uses a hardened, device-first encryption architecture built on reviewed cryptographic primitives, hybrid post-quantum key agreement, per-device ratcheted sessions, and strict metadata minimization.
