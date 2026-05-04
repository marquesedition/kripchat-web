import type { RealtimeChannel } from "@supabase/supabase-js";
import { localCryptoProvider } from "@/src/lib/crypto";
import { getDeviceId } from "@/src/lib/storage/secureStorage";
import { getConversationMembers } from "./conversations";
import { getUserDevices } from "./devices";
import { isUserBlocked } from "./blocks";
import { supabase } from "./client";
import { assertShieldCryptoProviderAvailable } from "@/src/lib/shield";

export type SendEncryptedMessageInput = {
  conversationId: string;
  senderUserId: string;
  senderDeviceId: string;
  recipientUserId: string;
  recipientDeviceId: string;
  recipientPublicKey: string;
  plaintext: string;
  messageType?: "text" | "image" | "audio" | "video" | "document" | "location";
  expiresAt?: string | null;
  attachment?: {
    encryptedFileUrl?: string | null;
    fileType?: string | null;
    fileSize?: number | null;
    encryptedFileKey?: string | null;
  };
};

export async function sendEncryptedMessage(input: SendEncryptedMessageInput) {
  assertShieldCryptoProviderAvailable();

  if (await isUserBlocked(input.recipientUserId)) {
    throw new Error("Cannot send messages to a blocked user.");
  }
  const encrypted = await localCryptoProvider.encryptMessage({
    plaintext: input.plaintext,
    recipientPublicKey: input.recipientPublicKey,
    senderUserId: input.senderUserId,
    senderDeviceId: input.senderDeviceId,
    recipientUserId: input.recipientUserId,
    recipientDeviceId: input.recipientDeviceId
  });
  const { data, error } = await supabase
    .from("encrypted_messages")
    .insert({
      conversation_id: input.conversationId,
      sender_user_id: input.senderUserId,
      sender_device_id: input.senderDeviceId,
      recipient_user_id: input.recipientUserId,
      recipient_device_id: input.recipientDeviceId,
      message_type: input.messageType ?? "text",
      ciphertext: encrypted.ciphertext,
      crypto_metadata: encrypted.cryptoMetadata,
      encrypted_file_url: input.attachment?.encryptedFileUrl ?? null,
      file_type: input.attachment?.fileType ?? null,
      file_size: input.attachment?.fileSize ?? null,
      encrypted_file_key: input.attachment?.encryptedFileKey ?? null,
      expires_at: input.expiresAt ?? null
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function sendEncryptedMessageToAllRecipientDevices(input: {
  conversationId: string;
  senderUserId: string;
  senderDeviceId: string;
  plaintext: string;
  messageType?: SendEncryptedMessageInput["messageType"];
}) {
  const members = await getConversationMembers(input.conversationId);
  const recipientIds = members.map((member) => member.user_id as string).filter((userId) => userId !== input.senderUserId);
  const rows = [];
  for (const recipientUserId of recipientIds) {
    const devices = await getUserDevices(recipientUserId);
    for (const device of devices) {
      rows.push(
        await sendEncryptedMessage({
          ...input,
          recipientUserId,
          recipientDeviceId: device.id,
          recipientPublicKey: device.public_identity_key
        })
      );
    }
  }
  return rows;
}

export async function getMessagesForCurrentDevice() {
  const deviceId = await getDeviceId();
  if (!deviceId) return [];
  const { data, error } = await supabase
    .from("encrypted_messages")
    .select("*")
    .eq("recipient_device_id", deviceId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function subscribeToIncomingMessages(onMessage: (message: Record<string, unknown>) => void): RealtimeChannel {
  const channel = supabase
    .channel("encrypted-inbox")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "encrypted_messages" }, (payload) => onMessage(payload.new))
    .subscribe();
  return channel;
}

export async function markAsDelivered(messageId: string) {
  const { error } = await supabase.from("encrypted_messages").update({ delivered_at: new Date().toISOString() }).eq("id", messageId);
  if (error) throw error;
}

export async function markAsRead(messageId: string, readReceiptsEnabled: boolean) {
  if (!readReceiptsEnabled) return null;
  const { data, error } = await supabase
    .from("encrypted_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMessageForEveryone(messageId: string) {
  const { data, error } = await supabase
    .from("encrypted_messages")
    .update({ deleted_for_all_at: new Date().toISOString(), ciphertext: "[deleted]" })
    .eq("id", messageId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
