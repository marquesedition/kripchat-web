import { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";
import {
  acceptChatRequest,
  decryptMessageRecord,
  destroyConversation,
  fetchChatRequests,
  fetchChatPreviews,
  fetchMessages,
  rejectChatRequest,
  requestDirectConversation,
  sendMessage,
  setConversationAutoDestroy,
  setConversationHighRisk,
  type DirectConversationRequestResult,
  type SendMessagePayload
} from "@/features/chat/chatService";
import type { ChatPreview, ChatRequest, Message } from "@/features/chat/types";
import { supabase } from "@/lib/supabase";
import { showBrowserMessageNotification } from "@/services/notifications";

type ChatState = {
  previews: ChatPreview[];
  requests: ChatRequest[];
  messagesByConversation: Record<string, Message[]>;
  previewLoading: boolean;
  messageLoading: boolean;
  activeChannel: RealtimeChannel | null;
  loadPreviews: (userId: string) => Promise<void>;
  loadRequests: () => Promise<void>;
  loadMessages: (conversationId: string, userId: string) => Promise<void>;
  loadOlderMessages: (conversationId: string, userId: string) => Promise<void>;
  send: (conversationId: string, senderId: string, payload: string | SendMessagePayload) => Promise<void>;
  destroy: (conversationId: string, userId: string) => Promise<void>;
  setAutoDestroy: (conversationId: string, userId: string, seconds: number | null) => Promise<void>;
  setHighRisk: (conversationId: string, userId: string, enabled: boolean) => Promise<void>;
  openDirect: (userId: string, username: string) => Promise<DirectConversationRequestResult>;
  acceptRequest: (requestId: string, userId: string) => Promise<string>;
  rejectRequest: (requestId: string, userId: string) => Promise<void>;
  subscribeToConversation: (conversationId: string, userId: string) => void;
  unsubscribeActive: () => void;
};

export const useChatStore = create<ChatState>((set, get) => ({
  previews: [],
  requests: [],
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

  loadRequests: async () => {
    const requests = await fetchChatRequests();
    set({ requests });
  },

  loadMessages: async (conversationId, userId) => {
    set({ messageLoading: true });
    try {
      const messages = await fetchMessages(conversationId, userId);
      set((state) => ({
        messagesByConversation: { ...state.messagesByConversation, [conversationId]: messages }
      }));
    } finally {
      set({ messageLoading: false });
    }
  },

  loadOlderMessages: async (conversationId, userId) => {
    const current = get().messagesByConversation[conversationId] ?? [];
    const oldest = current[0]?.created_at;
    if (!oldest) return;
    const older = await fetchMessages(conversationId, userId, oldest);
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
    const result = await requestDirectConversation(username);
    await get().loadPreviews(userId);
    await get().loadRequests();
    return result;
  },

  acceptRequest: async (requestId, userId) => {
    const conversationId = await acceptChatRequest(requestId);
    await get().loadPreviews(userId);
    await get().loadRequests();
    return conversationId;
  },

  rejectRequest: async (requestId, userId) => {
    await rejectChatRequest(requestId);
    await get().loadRequests();
  },

  destroy: async (conversationId, userId) => {
    await destroyConversation(conversationId);
    set((state) => {
      const { [conversationId]: _removed, ...messagesByConversation } = state.messagesByConversation;
      return {
        messagesByConversation,
        previews: state.previews.filter((item) => item.conversation.id !== conversationId)
      };
    });
    await get().loadPreviews(userId);
  },

  setAutoDestroy: async (conversationId, userId, seconds) => {
    await setConversationAutoDestroy(conversationId, seconds);
    await get().loadPreviews(userId);
  },

  setHighRisk: async (conversationId, userId, enabled) => {
    await setConversationHighRisk(conversationId, enabled);
    await get().loadPreviews(userId);
  },

  subscribeToConversation: (conversationId, userId) => {
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
        async (payload) => {
          const next = await decryptMessageRecord(payload.new as Message, userId, undefined, undefined, { retryPeerKey: true });
          if (next.sender_id !== userId) {
            showBrowserMessageNotification({
              title: "KripChat",
              body: next.kind === "text" ? "Nuevo paquete seguro recibido." : "Nuevo adjunto seguro recibido.",
              conversationId
            });
          }
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
