import { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";
import { createDirectConversation, decryptMessageRecord, fetchChatPreviews, fetchMessages, sendMessage, type SendMessagePayload } from "@/features/chat/chatService";
import type { ChatPreview, Message } from "@/features/chat/types";
import { supabase } from "@/lib/supabase";

type ChatState = {
  previews: ChatPreview[];
  messagesByConversation: Record<string, Message[]>;
  previewLoading: boolean;
  messageLoading: boolean;
  activeChannel: RealtimeChannel | null;
  loadPreviews: (userId: string) => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string) => Promise<void>;
  send: (conversationId: string, senderId: string, payload: string | SendMessagePayload) => Promise<void>;
  openDirect: (userId: string, username: string) => Promise<string>;
  subscribeToConversation: (conversationId: string) => void;
  unsubscribeActive: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  previews: [],
  messagesByConversation: {},
  previewLoading: false,
  messageLoading: false,
  activeChannel: null,

  loadPreviews: async (userId) => {
    set({ previewLoading: true });
    try {
      const previews = await fetchChatPreviews(userId);
      set({ previews });
    } finally {
      set({ previewLoading: false });
    }
  },

  loadMessages: async (conversationId) => {
    set({ messageLoading: true });
    try {
      const messages = await fetchMessages(conversationId);
      set((state) => ({
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: messages }
      }));
    } finally {
      set({ messageLoading: false });
    }
  },

  loadOlderMessages: async (conversationId) => {
    const current = get().messagesByConversation[conversationId] ?? [];
    const oldest = current[0]?.created_at;
    if (!oldest) return;
    const older = await fetchMessages(conversationId, oldest);
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: dedupeMessages([...older, ...current])
      }
    }));
  },

  send: async (conversationId, senderId, payload) => {
    const optimisticId = `${senderId}-${Date.now()}`;
    const nextPayload: SendMessagePayload = typeof payload === "string" ? { body: payload, kind: "text" } : payload;
    const optimistic: Message = {
      id: optimisticId,
      conversation_id: conversationId,
      sender_id: senderId,
      body: nextPayload.body,
      client_id: optimisticId,
      status: "sending",
      kind: nextPayload.kind ?? "text",
      attachment_path: nextPayload.attachmentPath ?? null,
      attachment_name: nextPayload.attachmentName ?? null,
      attachment_mime: nextPayload.attachmentMime ?? null,
      attachment_size: nextPayload.attachmentSize ?? null,
      location_lat: nextPayload.locationLat ?? null,
      location_lng: nextPayload.locationLng ?? null,
      location_label: nextPayload.locationLabel ?? null,
      created_at: new Date().toISOString()
    };
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...(state.messagesByConversation[conversationId] ?? []), optimistic]
      }
    }));

    try {
      const result = await sendMessage(conversationId, senderId, nextPayload, optimisticId);
      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: dedupeMessages(
            (state.messagesByConversation[conversationId] ?? []).map((message) =>
              message.id === optimistic.id ? result.saved : message
            )
          )
        }
      }));
    } catch (error) {
      set((state) => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: (state.messagesByConversation[conversationId] ?? []).map((message) =>
            message.id === optimistic.id ? { ...message, status: "failed" } : message
          )
        }
      }));
      throw error;
    }
  },

  openDirect: async (userId, username) => {
    const conversationId = await createDirectConversation(userId, username);
    await get().loadPreviews(userId);
    return conversationId;
  },

  subscribeToConversation: (conversationId) => {
    get().unsubscribeActive();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const next = decryptMessageRecord(payload.new as Message);
          set((state) => ({
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: dedupeMessages([...(state.messagesByConversation[conversationId] ?? []), next])
            }
          }));
        }
      )
      .subscribe();

    set({ activeChannel: channel });
  },

  unsubscribeActive: () => {
    const channel = get().activeChannel;
    if (channel) supabase.removeChannel(channel);
    set({ activeChannel: null });
  }
}));

function dedupeMessages(messages: Message[]) {
  const map = new Map<string, Message>();
  for (const message of messages) {
    map.set(message.client_id ?? message.id, message);
  }
  return Array.from(map.values()).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}
