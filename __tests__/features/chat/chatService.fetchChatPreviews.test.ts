import { fetchChatPreviews } from "@/features/chat/chatService";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/antiSpam", () => ({
  canSendMessage: jest.fn(() => true)
}));

jest.mock("@/lib/cryptoPayload", () => ({
  decryptBlobForConversation: jest.fn(),
  decryptTextForConversation: jest.fn((value: string) => value),
  encryptBlobForConversation: jest.fn(),
  encryptTextForConversation: jest.fn((value: string) => `enc:${value}`)
}));

jest.mock("@/lib/e2ee", () => ({
  deriveConversationSharedKey: jest.fn(async () => new Uint8Array([1, 2, 3, 4]))
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn()
  }
}));

describe("fetchChatPreviews fallback behavior", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("falls back to table queries when list_chat_previews RPC is missing", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: {
        code: "PGRST202",
        status: 404,
        message: "Could not find the function public.list_chat_previews()"
      }
    });

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "conversation_participants") {
        const query = {
          select: jest.fn(),
          eq: jest.fn()
        };
        query.select.mockReturnValue(query);
        query.eq.mockImplementation((column: string) => {
          if (column === "profile_id") {
            return Promise.resolve({
              data: [
                {
                  conversation_id: "conversation-1",
                  conversation: {
                    id: "conversation-1",
                    type: "direct",
                    created_at: "2026-04-27T10:00:00.000Z",
                    updated_at: "2026-04-27T10:10:00.000Z"
                  }
                }
              ],
              error: null
            });
          }

          if (column === "conversation_id") {
            return Promise.resolve({
              data: [
                {
                  conversation_id: "conversation-1",
                  profile_id: "user-1",
                  profile: {
                    id: "user-1",
                    username: "me",
                    avatar_url: null,
                    push_token: null,
                    e2ee_public_key: "user-key",
                    online_at: null,
                    created_at: "2026-04-27T10:00:00.000Z"
                  }
                },
                {
                  conversation_id: "conversation-1",
                  profile_id: "peer-1",
                  profile: {
                    id: "peer-1",
                    username: "peer",
                    avatar_url: null,
                    push_token: null,
                    e2ee_public_key: "peer-key",
                    online_at: "2026-04-27T10:09:30.000Z",
                    created_at: "2026-04-27T10:00:00.000Z"
                  }
                }
              ],
              error: null
            });
          }

          throw new Error(`Unexpected eq column: ${column}`);
        });

        return query;
      }

      if (table === "messages") {
        const query = {
          select: jest.fn(),
          eq: jest.fn(),
          order: jest.fn(),
          limit: jest.fn(),
          maybeSingle: jest.fn()
        };
        query.select.mockReturnValue(query);
        query.eq.mockReturnValue(query);
        query.order.mockReturnValue(query);
        query.limit.mockReturnValue(query);
        query.maybeSingle.mockResolvedValue({
          data: {
            id: "message-1",
            conversation_id: "conversation-1",
            sender_id: "peer-1",
            body: "encrypted-message",
            client_id: "client-1",
            status: "sent",
            kind: "text",
            attachment_path: null,
            attachment_name: null,
            attachment_mime: null,
            attachment_size: null,
            location_lat: null,
            location_lng: null,
            location_label: null,
            created_at: "2026-04-27T10:09:00.000Z"
          },
          error: null
        });
        return query;
      }

      throw new Error(`Unexpected table access: ${table}`);
    });

    const previews = await fetchChatPreviews("user-1");

    expect(previews).toHaveLength(1);
    expect(previews[0].conversation.id).toBe("conversation-1");
    expect(previews[0].peer?.username).toBe("peer");
    expect(previews[0].lastMessage?.id).toBe("message-1");
    expect(supabase.rpc).toHaveBeenCalledWith("list_chat_previews");
  });

  it("throws the original rpc error when it is not a missing-function case", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "permission denied"
      }
    });

    await expect(fetchChatPreviews("user-1")).rejects.toMatchObject({ code: "42501" });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
