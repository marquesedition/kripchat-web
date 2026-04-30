import { supabase } from "@/lib/supabase";
import { canSendMessage } from "@/lib/antiSpam";
import {
  decryptBlobForConversation,
  decryptTextForConversation,
  encryptBlobForConversation,
  encryptTextForConversation
} from "@/lib/cryptoPayload";
import { deriveConversationSharedKey, ensureE2EEIdentity, isV2EncryptedEnvelope } from "@/lib/e2ee";
import { sanitizeMessage } from "@/lib/validation";
import type { ChatPreview, Conversation, Message, MessageKind, Profile } from "@/features/chat/types";
import { sendExpoPushNotification } from "@/services/notifications";

const ATTACHMENT_BUCKET = "chat-attachments";
const SIGNED_URL_TTL_SECONDS = 60;
const PEER_KEY_RETRY_DELAYS_MS = [250, 750, 1500] as const;
const peerPublicKeyCache = new Map<string, string | null>();

type PreviewRpcRow = {
  conversation_id: string;
  conversation_type: Conversation["type"];
  conversation_created_at: string;
  conversation_updated_at: string;
  conversation_auto_destroy_seconds: number | null;
  conversation_auto_destroy_at: string | null;
  conversation_high_risk_enabled: boolean | null;
  conversation_crypto_epoch: number | null;
  conversation_crypto_destroyed_at: string | null;
  peer_id: string;
  peer_username: string;
  peer_avatar_url: string | null;
  peer_push_token: string | null;
  peer_e2ee_public_key: string | null;
  peer_online_at: string | null;
  peer_created_at: string;
  last_message_id: string | null;
  last_message_sender_id: string | null;
  last_message_body: string | null;
  last_message_client_id: string | null;
  last_message_status: Message["status"] | null;
  last_message_kind: Message["kind"] | null;
  last_message_attachment_path: string | null;
  last_message_attachment_name: string | null;
  last_message_attachment_mime: string | null;
  last_message_attachment_size: number | null;
  last_message_location_lat: number | null;
  last_message_location_lng: number | null;
  last_message_location_label: string | null;
  last_message_created_at: string | null;
};

export type SendMessagePayload = {
  body: string;
  kind?: MessageKind;
  attachmentPath?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  attachmentSize?: number | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationLabel?: string | null;
};

export type UploadAttachmentInput = {
  conversationId: string;
  senderId: string;
  uri: string;
  name: string;
  mimeType: string;
};

export async function fetchChatPreviews(currentUserId: string): Promise<ChatPreview[]> {
  await destroyExpiredConversations();
  const { data, error } = await supabase.rpc("list_chat_previews");
  if (error) {
    if (isMissingChatPreviewsRpc(error)) {
      return fetchChatPreviewsFallback(currentUserId);
    }
    throw error;
  }

  return mapPreviewsFromRpcRows((data ?? []) as PreviewRpcRow[], currentUserId);
}

export async function fetchMessages(conversationId: string, currentUserId: string, before?: string): Promise<Message[]> {
  await destroyExpiredConversations();
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  const peer = await fetchConversationPeer(conversationId, currentUserId);
  const decrypted = await Promise.all(
    ((data ?? []) as Message[]).map((message) => decryptMessageRecord(message, currentUserId, peer?.e2ee_public_key ?? null))
  );
  return decrypted.reverse();
}

export async function sendMessage(conversationId: string, senderId: string, payload: SendMessagePayload, clientId: string) {
  const kind = payload.kind ?? "text";
  const clean = kind === "text" ? sanitizeMessage(payload.body) : sanitizeMessage(payload.body) || fallbackBodyForKind(kind, payload.attachmentName);
  if (!clean && kind === "text") throw new Error("Message is empty");
  if (!canSendMessage()) throw new Error("Slow down before sending another packet");

  const optimistic: Message = {
    id: clientId,
    conversation_id: conversationId,
    sender_id: senderId,
    body: clean,
    client_id: clientId,
    status: "sending",
    kind,
    attachment_path: payload.attachmentPath ?? null,
    attachment_name: payload.attachmentName ?? null,
    attachment_mime: payload.attachmentMime ?? null,
    attachment_size: payload.attachmentSize ?? null,
    location_lat: payload.locationLat ?? null,
    location_lng: payload.locationLng ?? null,
    location_label: payload.locationLabel ?? null,
    created_at: new Date().toISOString()
  };

  const sharedKey = await resolveConversationSharedKey(conversationId, senderId, true);
  const encryptedBody = encryptTextForConversation(clean, sharedKey);
  const encryptedLocationLabel = payload.locationLabel
    ? encryptTextForConversation(payload.locationLabel, sharedKey)
    : null;

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      body: encryptedBody,
      client_id: clientId,
      status: "sent",
      kind,
      attachment_path: payload.attachmentPath ?? null,
      attachment_name: payload.attachmentName ?? null,
      attachment_mime: payload.attachmentMime ?? null,
      attachment_size: payload.attachmentSize ?? null,
      location_lat: payload.locationLat ?? null,
      location_lng: payload.locationLng ?? null,
      location_label: encryptedLocationLabel
    })
    .select()
    .single();

  if (error) throw error;
  notifyPeerOfMessage(conversationId, senderId, kind).catch(() => undefined);
  return { optimistic, saved: await decryptMessageRecord(data as Message, senderId, undefined, sharedKey) };
}

export async function uploadChatAttachment(input: UploadAttachmentInput) {
  const response = await fetch(input.uri);
  const blob = await response.blob();
  const safeName = input.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${input.conversationId}/${input.senderId}/${Date.now()}-${safeName}`;

  const sharedKey = await requireConversationSharedKey(input.conversationId, input.senderId);
  const encryptedBlob = await encryptBlobForConversation(blob, sharedKey);

  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(filePath, encryptedBlob, {
      contentType: "application/octet-stream",
      upsert: false
    });

  if (error) throw error;
  await logSecurityEvent(input.senderId, input.conversationId, "attachment_uploaded", {
    mimeType: input.mimeType,
    size: blob.size
  });

  return {
    path: data.path,
    name: safeName,
    mimeType: input.mimeType,
    size: blob.size
  };
}

export async function destroyConversation(conversationId: string) {
  await logSecurityEvent(null, conversationId, "destroy_conversation_requested", {});
  await removeConversationAttachments(conversationId);
  const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
  if (error) throw error;
  peerPublicKeyCache.forEach((_value, key) => {
    if (key.endsWith(`:${conversationId}`)) peerPublicKeyCache.delete(key);
  });
}

export async function setConversationAutoDestroy(conversationId: string, seconds: number | null) {
  const { error } = await supabase.rpc("set_conversation_auto_destroy", {
    p_conversation_id: conversationId,
    p_seconds: seconds
  });
  if (error) throw error;
  await logSecurityEvent(null, conversationId, "auto_destroy_set", { seconds });
}

export async function setConversationHighRisk(conversationId: string, enabled: boolean) {
  const { error } = await supabase.rpc("set_conversation_high_risk", {
    p_conversation_id: conversationId,
    p_enabled: enabled
  });
  if (error) throw error;
}

export async function destroyExpiredConversations() {
  try {
    const { data, error: selectError } = await supabase
      .from("conversations")
      .select("id")
      .not("auto_destroy_at", "is", null)
      .lte("auto_destroy_at", new Date().toISOString());
    if (selectError) return;

    const conversationIds = ((data ?? []) as Array<{ id: string }>).map((conversation) => conversation.id);
    for (const conversationId of conversationIds) {
      await removeConversationAttachments(conversationId);
    }

    if (!conversationIds.length) return;

    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .in("id", conversationIds);
    if (deleteError) return;
  } catch {
    return;
  }
}

export async function createAttachmentSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

export async function createDecryptedAttachmentUrl(path: string, conversationId: string, currentUserId: string, mimeType: string) {
  await logSecurityEvent(currentUserId, conversationId, "attachment_opened", { mimeType });
  const signedUrl = await createAttachmentSignedUrl(path);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("Unable to download encrypted payload");
  const encryptedBlob = await response.blob();
  const peer = await fetchConversationPeer(conversationId, currentUserId);
  const sharedKey = peer?.e2ee_public_key ? await deriveConversationSharedKey(currentUserId, peer.e2ee_public_key, conversationId) : null;
  const decryptedBlob = await decryptBlobForConversation(encryptedBlob, conversationId, mimeType, sharedKey);

  if (typeof URL !== "undefined" && URL.createObjectURL) {
    return URL.createObjectURL(decryptedBlob);
  }

  return blobToDataUri(decryptedBlob);
}

export async function decryptMessageRecord(
  message: Message,
  currentUserId: string,
  peerPublicKey?: string | null,
  sharedKeyOverride?: Uint8Array | null,
  options: { retryPeerKey?: boolean } = {}
): Promise<Message> {
  const encryptedBody = message.body;
  const encryptedLocationLabel = message.location_label;
  let sharedKey: Uint8Array | null = sharedKeyOverride ?? null;
  let resolvedPeerPublicKey = peerPublicKey ?? null;
  if (!sharedKey) {
    resolvedPeerPublicKey = await resolvePeerPublicKey(message.conversation_id, currentUserId, peerPublicKey);
    if (resolvedPeerPublicKey) {
      try {
        sharedKey = await deriveConversationSharedKey(currentUserId, resolvedPeerPublicKey, message.conversation_id);
      } catch {
        sharedKey = null;
      }
    }
  }

  let decryptedBody = decryptTextForConversation(message.body, message.conversation_id, sharedKey);
  let decryptedLocationLabel = message.location_label
    ? decryptTextForConversation(message.location_label, message.conversation_id, sharedKey)
    : null;

  if (!sharedKeyOverride && isV2EncryptedEnvelope(message.body) && decryptedBody === "[encrypted packet]") {
    const maxAttempts = options.retryPeerKey ? PEER_KEY_RETRY_DELAYS_MS.length + 1 : 1;
    for (let attempt = 0; attempt < maxAttempts && decryptedBody === "[encrypted packet]"; attempt += 1) {
      if (attempt > 0) await sleep(PEER_KEY_RETRY_DELAYS_MS[attempt - 1]);

      const refreshedPeerPublicKey = await resolvePeerPublicKey(message.conversation_id, currentUserId, undefined, true);
      if (!refreshedPeerPublicKey) continue;

      try {
        const refreshedSharedKey = await deriveConversationSharedKey(currentUserId, refreshedPeerPublicKey, message.conversation_id);
        decryptedBody = decryptTextForConversation(message.body, message.conversation_id, refreshedSharedKey);
        decryptedLocationLabel = message.location_label
          ? decryptTextForConversation(message.location_label, message.conversation_id, refreshedSharedKey)
          : null;
        resolvedPeerPublicKey = refreshedPeerPublicKey;
      } catch {
        // Keep retrying while the peer profile/key is still settling.
      }
    }
  }

  return {
    ...message,
    body: decryptedBody,
    encrypted_body: encryptedBody,
    location_label: decryptedLocationLabel,
    encrypted_location_label: encryptedLocationLabel
  };
}

export async function createDirectConversation(currentUserId: string, username: string) {
  const { data: authData } = await supabase.auth.getSession();
  const sessionUser = authData.session?.user;
  if (!sessionUser?.id) throw new Error("Sign in before opening a channel.");
  if (!sessionUser.email_confirmed_at) throw new Error("Confirm your email before opening a channel.");

  const normalizedUsername = username.trim().toLowerCase();
  if (!normalizedUsername) throw new Error("Enter a valid username.");

  const { data, error } = await supabase.rpc("create_direct_conversation_by_username", {
    peer_username: normalizedUsername
  });
  if (error) {
    const rawMessage = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
    if (error.code === "42501" || rawMessage.includes("row-level security") || rawMessage.includes("permission denied")) {
      throw new Error("Supabase blocked profile lookup. Sign in with a confirmed account and try again.");
    }
    if (rawMessage.includes("peer not found")) {
      throw error;
    }
    throw error;
  }
  return data as string;
}

export async function updatePresence(userId: string) {
  await supabase.from("profiles").update({ online_at: new Date().toISOString() }).eq("id", userId);
}

export async function clearPresence(userId: string) {
  await supabase.from("profiles").update({ online_at: null }).eq("id", userId);
}

function isOnline(value?: string | null) {
  if (!value) return false;
  return Date.now() - new Date(value).getTime() < 90_000;
}

function fallbackBodyForKind(kind: MessageKind, name?: string | null) {
  if (kind === "image") return `[image] ${name ?? "secure image"}`;
  if (kind === "video") return `[video] ${name ?? "secure video"}`;
  if (kind === "audio") return `[audio] ${name ?? "secure audio"}`;
  if (kind === "document") return `[document] ${name ?? "secure document"}`;
  if (kind === "location") return "[location] secure coordinates";
  return "";
}

async function mapPreviewsFromRpcRows(rows: PreviewRpcRow[], currentUserId: string) {
  return Promise.all(
    rows.map(async (row) => {
      const conversation: Conversation = {
        id: row.conversation_id,
        type: row.conversation_type,
        created_at: row.conversation_created_at,
        updated_at: row.conversation_updated_at,
        auto_destroy_seconds: row.conversation_auto_destroy_seconds ?? null,
        auto_destroy_at: row.conversation_auto_destroy_at ?? null,
        high_risk_enabled: row.conversation_high_risk_enabled ?? false,
        crypto_epoch: row.conversation_crypto_epoch ?? 1,
        crypto_destroyed_at: row.conversation_crypto_destroyed_at ?? null
      };

      const peer: Profile = {
        id: row.peer_id,
        username: row.peer_username,
        avatar_url: row.peer_avatar_url,
        push_token: row.peer_push_token,
        e2ee_public_key: row.peer_e2ee_public_key,
        online_at: row.peer_online_at,
        created_at: row.peer_created_at
      };

      const lastMessage =
        row.last_message_id && row.last_message_body && row.last_message_sender_id && row.last_message_status && row.last_message_kind && row.last_message_created_at
          ? await decryptMessageRecord(
              {
                id: row.last_message_id,
                conversation_id: row.conversation_id,
                sender_id: row.last_message_sender_id,
                body: row.last_message_body,
                client_id: row.last_message_client_id,
                status: row.last_message_status,
                kind: row.last_message_kind,
                attachment_path: row.last_message_attachment_path,
                attachment_name: row.last_message_attachment_name,
                attachment_mime: row.last_message_attachment_mime,
                attachment_size: row.last_message_attachment_size,
                location_lat: row.last_message_location_lat,
                location_lng: row.last_message_location_lng,
                location_label: row.last_message_location_label,
                created_at: row.last_message_created_at
              },
              currentUserId,
              peer.e2ee_public_key
            )
          : null;

      return {
        conversation,
        peer,
        peerOnline: isOnline(peer.online_at),
        lastMessage
      } satisfies ChatPreview;
    })
  );
}

async function fetchChatPreviewsFallback(currentUserId: string): Promise<ChatPreview[]> {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("conversation_id, conversation:conversations(id,type,created_at,updated_at)")
    .eq("profile_id", currentUserId);
  if (error) throw error;

  const conversations = ((data ?? []) as Array<{ conversation: Conversation | Conversation[] | null }>)
    .map((row) => (Array.isArray(row.conversation) ? row.conversation[0] : row.conversation))
    .filter((conversation): conversation is Conversation => Boolean(conversation))
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return Promise.all(
    conversations.map(async (conversation) => {
      const peer = await fetchConversationPeer(conversation.id, currentUserId);
      const lastMessage = await fetchLastMessageForConversation(conversation.id, currentUserId, peer?.e2ee_public_key ?? null);
      return {
        conversation,
        peer,
        peerOnline: isOnline(peer?.online_at),
        lastMessage
      } satisfies ChatPreview;
    })
  );
}

async function fetchLastMessageForConversation(conversationId: string, currentUserId: string, peerPublicKey?: string | null) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return decryptMessageRecord(data as Message, currentUserId, peerPublicKey);
}

async function fetchConversationPeer(conversationId: string, currentUserId: string) {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("profile_id, profile:profiles(*)")
    .eq("conversation_id", conversationId);
  if (error) throw error;
  return findPeerProfile((data ?? []) as Array<{ conversation_id?: string; profile_id: string; profile: Profile | Profile[] | null }>, conversationId, currentUserId);
}

async function resolvePeerPublicKey(conversationId: string, currentUserId: string, providedPeerPublicKey?: string | null, forceRefresh = false) {
  const cacheKey = `${currentUserId}:${conversationId}`;
  if (providedPeerPublicKey !== undefined) {
    return providedPeerPublicKey;
  }

  if (!forceRefresh && peerPublicKeyCache.has(cacheKey)) {
    return peerPublicKeyCache.get(cacheKey) ?? null;
  }

  try {
    const peer = await fetchConversationPeer(conversationId, currentUserId);
    const key = peer?.e2ee_public_key ?? null;
    peerPublicKeyCache.set(cacheKey, key);
    return key;
  } catch {
    return null;
  }
}

function findPeerProfile(
  participants: Array<{ conversation_id?: string; profile_id: string; profile: Profile | Profile[] | null }>,
  conversationId: string,
  currentUserId: string
) {
  const peerRecord = participants.find((item) => {
    if (item.conversation_id && item.conversation_id !== conversationId) return false;
    const profile = Array.isArray(item.profile) ? item.profile[0] : item.profile;
    return profile?.id !== currentUserId;
  });
  return (Array.isArray(peerRecord?.profile) ? peerRecord?.profile[0] : peerRecord?.profile ?? null) as Profile | null;
}

function isMissingChatPreviewsRpc(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: unknown; message?: unknown; details?: unknown; status?: unknown };
  const code = String(maybeError.code ?? "").toLowerCase();
  const status = Number(maybeError.status ?? 0);
  const message = String(maybeError.message ?? "").toLowerCase();
  const details = String(maybeError.details ?? "").toLowerCase();
  const text = `${message} ${details}`;

  return code === "pgrst202" || status === 404 || text.includes("could not find the function") || text.includes("not found");
}

async function requireConversationSharedKey(conversationId: string, currentUserId: string) {
  await ensureSenderKeyPublished(currentUserId);
  const peer = await fetchConversationPeer(conversationId, currentUserId);
  if (!peer?.e2ee_public_key) {
    throw new Error("The other user has not published an E2EE key yet. Ask them to sign in again to complete secure setup.");
  }

  return deriveConversationSharedKey(currentUserId, peer.e2ee_public_key, conversationId);
}

async function ensureSenderKeyPublished(currentUserId: string) {
  const identity = await ensureE2EEIdentity(currentUserId);
  const { error } = await supabase
    .from("profiles")
    .update({ e2ee_public_key: identity.publicKey })
    .eq("id", currentUserId);
  if (error) {
    throw new Error("Unable to sync your secure identity. Sign out and sign in again.");
  }
}

async function resolveConversationSharedKey(conversationId: string, currentUserId: string, retryPeerKey = false) {
  let lastError: unknown;
  const attempts = retryPeerKey ? PEER_KEY_RETRY_DELAYS_MS.length + 1 : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await sleep(PEER_KEY_RETRY_DELAYS_MS[attempt - 1]);

    try {
      return await requireConversationSharedKey(conversationId, currentUserId);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("The other user has not published an E2EE key yet. Ask them to sign in again to complete secure setup.");
}

async function notifyPeerOfMessage(conversationId: string, senderId: string, kind: MessageKind) {
  const peer = await fetchConversationPeer(conversationId, senderId);
  if (!peer?.push_token) return;

  await sendExpoPushNotification({
    to: peer.push_token,
    title: "KripChat",
    body: notificationBodyForKind(kind),
    conversationId
  });

  await logSecurityEvent(senderId, conversationId, "push_notification_sent", { kind });
}

function notificationBodyForKind(kind: MessageKind) {
  if (kind === "text") return "Nuevo paquete seguro recibido.";
  if (kind === "location") return "Nueva ubicacion segura recibida.";
  return "Nuevo adjunto seguro recibido.";
}

async function removeConversationAttachments(conversationId: string) {
  const paths = await listAttachmentPaths(conversationId);
  if (!paths.length) return;

  const { error } = await supabase.storage.from(ATTACHMENT_BUCKET).remove(paths);
  if (error) throw error;
}

async function listAttachmentPaths(prefix: string): Promise<string[]> {
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: "name", order: "asc" }
  });
  if (error) throw error;

  const paths: string[] = [];
  for (const item of data ?? []) {
    const itemPath = `${prefix}/${item.name}`;
    if (item.id) {
      paths.push(itemPath);
      continue;
    }
    paths.push(...(await listAttachmentPaths(itemPath)));
  }
  return paths;
}

function blobToDataUri(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to open secure payload"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });
}

async function logSecurityEvent(actorId: string | null, conversationId: string, eventType: string, metadata: Record<string, unknown>) {
  try {
    const resolvedActorId = actorId ?? (await supabase.auth.getSession()).data.session?.user.id;
    if (!resolvedActorId) return;

    await supabase.from("security_audit_events").insert({
      actor_id: resolvedActorId,
      conversation_id: conversationId,
      event_type: eventType,
      metadata
    });
  } catch {
    return;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
