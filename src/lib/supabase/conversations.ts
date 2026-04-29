import { supabase } from "./client";

export async function createDirectConversation(peerId: string) {
  const { data, error } = await supabase.rpc("create_direct_conversation_v2", { peer_id: peerId });
  if (error) throw error;
  return data as string;
}

export async function getMyConversations() {
  const { data, error } = await supabase
    .from("conversation_members")
    .select("*, conversation:conversations(*)")
    .is("left_at", null)
    .is("archived_at", null)
    .order("pinned_at", { ascending: false, nullsFirst: false })
    .order("joined_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getConversationMembers(conversationId: string) {
  const { data, error } = await supabase
    .from("conversation_members")
    .select("*, profile:profiles(id, username, display_name, avatar_url)")
    .eq("conversation_id", conversationId)
    .is("left_at", null);
  if (error) throw error;
  return data ?? [];
}

export async function archiveConversation(conversationId: string, archived = true) {
  return updateMyConversationMember(conversationId, { archived_at: archived ? new Date().toISOString() : null });
}

export async function pinConversation(conversationId: string, pinned = true) {
  return updateMyConversationMember(conversationId, { pinned_at: pinned ? new Date().toISOString() : null });
}

export async function muteConversation(conversationId: string, mutedUntil: string | null) {
  return updateMyConversationMember(conversationId, { muted_until: mutedUntil });
}

export async function updateReadReceipts(conversationId: string, enabled: boolean) {
  return updateMyConversationMember(conversationId, { read_receipts_enabled: enabled });
}

export async function updateDisappearingMessages(conversationId: string, enabled: boolean, expirationSeconds: number | null) {
  return updateMyConversationMember(conversationId, {
    disappearing_messages_enabled: enabled,
    expiration_seconds: enabled ? expirationSeconds : null
  });
}

async function updateMyConversationMember(conversationId: string, patch: Record<string, unknown>) {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Sign in before updating chat settings.");
  const { data, error } = await supabase
    .from("conversation_members")
    .update(patch)
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}
