import { supabase } from "@/lib/supabase";
import { canSendMessage } from "@/lib/antiSpam";
import { decryptBlobForConversation, decryptTextForConversation, encryptBlobForConversation, encryptTextForConversation } from "@/lib/cryptoPayload";
import { sanitizeMessage } from "@/lib/validation";
import type { ChatPreview, Conversation, Message, MessageKind, Profile } from "@/features/chat/types";

const ATTACHMENT_BUCKET = "chat-attachments";

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
  const { data: memberships, error: memberError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("profile_id", currentUserId);
  if (memberError) throw memberError;

  const conversationIds = memberships?.map((item) => item.conversation_id) ?? [];
  if (!conversationIds.length) return [];

  const [{ data: conversations, error: conversationError }, { data: participants, error: participantsError }, { data: messages, error: messageError }] =
    await Promise.all([
      supabase.from("conversations").select("*").in("id", conversationIds).order("updated_at", { ascending: false }),
      supabase.from("conversation_participants").select("conversation_id, profile:profiles(*)").in("conversation_id", conversationIds),
      supabase.from("messages").select("*").in("conversation_id", conversationIds).order("created_at", { ascending: false }).limit(100)
    ]);

  if (conversationError) throw conversationError;
  if (participantsError) throw participantsError;
  if (messageError) throw messageError;

  const latestByConversation = new Map<string, Message>();
  for (const message of (messages ?? []) as Message[]) {
    if (!latestByConversation.has(message.conversation_id)) {
      latestByConversation.set(message.conversation_id, decryptMessageRecord(message));
    }
  }

  return ((conversations ?? []) as Conversation[]).map((conversation) => {
    const peers = (participants ?? []).filter((item) => item.conversation_id === conversation.id);
    const peerRecord = peers.find((item) => {
      const profile = Array.isArray(item.profile) ? item.profile[0] : item.profile;
      return profile?.id !== currentUserId;
    });
    const peer = (Array.isArray(peerRecord?.profile) ? peerRecord?.profile[0] : peerRecord?.profile ?? null) as Profile | null;
    return {
      conversation,
      peer,
      peerOnline: isOnline(peer?.online_at),
      lastMessage: latestByConversation.get(conversation.id) ?? null
    };
  });
}

export async function fetchMessages(conversationId: string, before?: string): Promise<Message[]> {
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (before) query = query.lt("created_at", before);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as Message[]).map(decryptMessageRecord).reverse();
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

  const encryptedBody = encryptTextForConversation(clean, conversationId);
  const encryptedLocationLabel = payload.locationLabel ? encryptTextForConversation(payload.locationLabel, conversationId) : null;

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
  return { optimistic, saved: decryptMessageRecord(data as Message) };
}

export async function uploadChatAttachment(input: UploadAttachmentInput) {
  const response = await fetch(input.uri);
  const blob = await response.blob();
  const safeName = input.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${input.conversationId}/${input.senderId}/${Date.now()}-${safeName}`;

  const encryptedBlob = await encryptBlobForConversation(blob, input.conversationId);

  const { data, error } = await supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(filePath, encryptedBlob, {
      contentType: "application/octet-stream",
      upsert: false
    });

  if (error) throw error;

  return {
    path: data.path,
    name: safeName,
    mimeType: input.mimeType,
    size: blob.size
  };
}

export async function createAttachmentSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from(ATTACHMENT_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function createDecryptedAttachmentUrl(path: string, conversationId: string, mimeType: string) {
  const signedUrl = await createAttachmentSignedUrl(path);
  const response = await fetch(signedUrl);
  if (!response.ok) throw new Error("Unable to download encrypted payload");
  const encryptedBlob = await response.blob();
  const decryptedBlob = await decryptBlobForConversation(encryptedBlob, conversationId, mimeType);

  if (typeof URL !== "undefined" && URL.createObjectURL) {
    return URL.createObjectURL(decryptedBlob);
  }

  return blobToDataUri(decryptedBlob);
}

export function decryptMessageRecord(message: Message): Message {
  return {
    ...message,
    body: decryptTextForConversation(message.body, message.conversation_id),
    location_label: message.location_label ? decryptTextForConversation(message.location_label, message.conversation_id) : null
  };
}

export async function createDirectConversation(currentUserId: string, username: string) {
  const { data: peer, error: peerError } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.trim().toLowerCase())
    .neq("id", currentUserId)
    .maybeSingle();
  if (peerError) throw peerError;
  if (!peer) throw new Error("No profile found for that username");

  const { data, error } = await supabase.rpc("create_direct_conversation", {
    peer_id: peer.id
  });
  if (error) throw error;
  return data as string;
}

export async function updatePresence(userId: string) {
  await supabase.from("profiles").update({ online_at: new Date().toISOString() }).eq("id", userId);
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

function blobToDataUri(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to open secure payload"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });
}
