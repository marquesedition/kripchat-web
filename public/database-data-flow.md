# KripChat database data flow

This document is public-safe: it describes how data moves through the database
without secrets, service-role keys, passwords, or private cryptographic keys.

## Current database shape

| Area | Tables / storage | Purpose | Stored content |
| --- | --- | --- | --- |
| Identity | `auth.users`, `profiles` | Login account plus public handle/profile | Internal auth email in Supabase Auth, public username, avatar, display name, bio, public E2EE key, push token, online timestamp |
| Devices | `devices`, `prekeys` | Public device key bundles | Device id, public identity key, signed prekey, one-time prekeys, Shield contract fields |
| Conversations | `conversations`, `conversation_members`, `conversation_participants` | Chat metadata and membership | Conversation ids, type, settings, member controls, legacy participant compatibility |
| Requests | `chat_requests` | Inbox request flow before a direct chat starts | Requester, recipient, status, accepted conversation id |
| Messages | `encrypted_messages`, `messages` | Current device-targeted encrypted messages plus legacy fallback | Ciphertext, routing metadata, delivery/read timestamps, attachment metadata |
| Attachments | Storage bucket `encrypted-media` | Encrypted file payloads | Object path and encrypted bytes; type/size metadata can still be visible |
| Blocking | `blocked_users` | User block graph | Blocker id, blocked id, timestamp |
| Audit | `security_audit_events` | Non-sensitive security events | Actor, optional conversation, event type, JSON metadata |

`shield_device_verifications` was removed because the current app does not read
or write it. The Shield columns on `devices`, `prekeys`, and
`encrypted_messages` remain because they are harmless contract fields for a
future provider.

## Use cases and how they appear in the database

### 1. Register a user

1. User enters `hacker_handle` and password.
2. The app derives an internal email like `handle@kripchat.invalid`.
3. Supabase Auth creates a row in `auth.users`.
4. The auth trigger creates `profiles.id = auth.users.id`.
5. The client prepares local E2EE key material and publishes public fields.
6. The current device is registered in `devices`.

Database view:

```text
auth.users.id
  -> profiles.id
  -> devices.user_id
  -> prekeys.device_id
```

Private keys never go to Supabase.

### 2. Login and presence

1. User logs in with handle/password.
2. Supabase returns a session.
3. The app loads `profiles`.
4. The current device is upserted in `devices`.
5. Presence updates `profiles.online_at`.

Database view:

```text
profiles.online_at = current timestamp while active
devices.last_seen_at = current timestamp for active device bundle
```

### 3. Search a handle

1. The client calls `search_profiles_by_username_v2`.
2. The function returns only public profile fields.
3. Profile visibility is constrained by RLS/RPC rules.

Database view:

```text
profiles.username ilike normalized_search || '%'
```

### 4. Request a direct chat

1. User searches a peer by username.
2. Client calls `request_direct_conversation_by_username`.
3. The RPC validates auth, self-chat, blocks, existing conversation, and pending request.
4. It inserts or returns a row in `chat_requests`.

Database view:

```text
chat_requests
  requester_id = current user
  recipient_id = peer
  status = 'pending'
```

### 5. Accept a chat request

1. Recipient accepts the request.
2. Client calls `accept_chat_request`.
3. RPC creates a `conversations` row if needed.
4. Membership is written to both `conversation_participants` and
   `conversation_members`.
5. `chat_requests.status` becomes `accepted`.

Database view:

```text
conversations.id
  -> conversation_members.conversation_id
  -> conversation_participants.conversation_id
  -> chat_requests.conversation_id
```

`conversation_participants` is legacy, but still live. Do not drop it until the
client, RPCs, realtime subscriptions, and tests stop referencing it.

### 6. Send a message

1. Sender device is registered.
2. App reads active `devices` for every active conversation member.
3. The client encrypts one copy per recipient device.
4. The app inserts one row per recipient device into `encrypted_messages`.
5. A trigger updates `conversations.updated_at` and `last_message_at`.
6. Realtime subscribers receive the insert/update event.

Database view:

```text
encrypted_messages.conversation_id
encrypted_messages.sender_user_id
encrypted_messages.sender_device_id
encrypted_messages.recipient_user_id
encrypted_messages.recipient_device_id
encrypted_messages.ciphertext
encrypted_messages.crypto_metadata
```

Supabase stores ciphertext and routing metadata. Message plaintext should not be
stored in the database.

### 7. Read or deliver a message

1. Recipient device fetches rows where `recipient_device_id` equals the local device id.
2. The client decrypts locally.
3. Delivery/read receipts update `encrypted_messages.delivered_at` or `read_at`.

Database view:

```text
encrypted_messages.delivered_at = timestamp
encrypted_messages.read_at = timestamp
```

### 8. Send an attachment

1. Client encrypts the file bytes.
2. Encrypted bytes are uploaded to private storage bucket `encrypted-media`.
3. The related encrypted message row stores path/type/size metadata.
4. Opening the attachment creates a short-lived signed URL and decrypts locally.

Database/storage view:

```text
storage.objects.bucket_id = 'encrypted-media'
storage.objects.name = '<conversation_id>/<sender_id>/<timestamp>-<safe_name>'
encrypted_messages.encrypted_file_url = storage path
encrypted_messages.file_type / file_size = metadata
```

Attachment metadata still leaks path, type, and size. Do not describe attachment
storage as metadata-private.

### 9. Archive, pin, mute, read receipts, disappearing messages

Per-user conversation controls live on `conversation_members`, not on the
conversation itself.

Database view:

```text
conversation_members.archived_at
conversation_members.pinned_at
conversation_members.muted_until
conversation_members.read_receipts_enabled
conversation_members.disappearing_messages_enabled
conversation_members.expiration_seconds
```

### 10. Block a user

1. User inserts a row in `blocked_users`.
2. RPCs and message insert policies block new conversations/messages between
   either side of the pair.

Database view:

```text
blocked_users.blocker_id = current user
blocked_users.blocked_id = blocked peer
```

### 11. High risk mode

1. Client calls `set_conversation_high_risk`.
2. `conversations.high_risk_enabled` changes.
3. Enabling high risk increments `conversations.crypto_epoch`.
4. A non-sensitive event is written to `security_audit_events`.

Database view:

```text
conversations.high_risk_enabled
conversations.crypto_epoch
security_audit_events.event_type = high_risk_enabled / high_risk_disabled
```

### 12. Destroy conversation for everyone

1. Client calls `destroy_conversation_for_everyone`.
2. RPC checks membership.
3. Server deletes encrypted messages, legacy messages, memberships,
   participants, accepted request links, and the conversation row.
4. Client removes local state and realtime sends delete events.

Database view after destroy:

```text
encrypted_messages rows for conversation: deleted
messages rows for conversation: deleted
conversation_members rows: deleted
conversation_participants rows: deleted
chat_requests accepted link: deleted or cleared by RPC logic
conversations row: deleted
```

## Tables not removed today

`messages` is legacy, but still used as fallback by the current client and by
preview/realtime code. It should only be dropped after old rows are migrated or
accepted as disposable and every code reference is removed.

`conversation_participants` is legacy, but still used by RPCs, peer lookups,
realtime inbox refresh, fallback code, and tests. It should only be dropped
after those paths are moved to `conversation_members`.

## SQL toolkit

Operational SQL lives in:

```text
supabase/sql/kripchat_database_toolkit.sql
```

It includes schema inventory, RLS review, use-case queries, data quality checks,
safe maintenance statements, and future retirement checks for legacy tables.
