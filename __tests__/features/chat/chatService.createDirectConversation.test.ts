import { destroyConversation, requestDirectConversation } from "@/features/chat/chatService";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/antiSpam", () => ({
  canSendMessage: jest.fn(() => true)
}));

jest.mock("@/lib/cryptoPayload", () => ({
  decryptBlobForConversation: jest.fn(),
  decryptTextForConversation: jest.fn(),
  encryptBlobForConversation: jest.fn(),
  encryptTextForConversation: jest.fn()
}));

jest.mock("@/lib/e2ee", () => ({
  deriveConversationSharedKey: jest.fn(),
  ensureE2EEIdentity: jest.fn(async () => ({ publicKey: "local-public", secretKey: "local-secret", version: 1, createdAt: "now" })),
  isV2EncryptedEnvelope: jest.fn((value: string) => value.startsWith("krypchat:v2:"))
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn()
    },
    from: jest.fn(),
    rpc: jest.fn()
  }
}));

describe("requestDirectConversation guards and error translation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires an authenticated session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    await expect(requestDirectConversation("peer")).rejects.toThrow("Sign in before opening a channel.");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("rejects empty usernames before querying Supabase", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1" } } }
    });

    await expect(requestDirectConversation("   ")).rejects.toThrow("Enter a valid username.");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("maps RLS/permission lookup failures to a user-facing message", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1" } } }
    });
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "permission denied",
        details: "row-level security policy"
      }
    });

    await expect(requestDirectConversation("Peer_Name")).rejects.toThrow(
      "Supabase blocked profile lookup. Sign in with an active account and try again."
    );
  });

  it("preserves peer-not-found rpc errors so the API message can be shown", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1" } } }
    });
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: {
        code: "P0001",
        message: "peer not found",
        details: null
      }
    });

    await expect(requestDirectConversation("Peer_Name")).rejects.toMatchObject({
      code: "P0001",
      message: "peer not found"
    });
  });

  it("returns an accepted conversation when lookup and rpc succeed", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1" } } }
    });
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [
        {
          request_id: null,
          status: "accepted",
          conversation_id: "conversation-1",
          peer_id: "peer-1"
        }
      ],
      error: null
    });

    await expect(requestDirectConversation("Peer_Name")).resolves.toEqual({
      requestId: null,
      status: "accepted",
      conversationId: "conversation-1",
      peerId: "peer-1"
    });
    expect(supabase.rpc).toHaveBeenCalledWith("request_direct_conversation_by_username", { peer_username: "peer_name" });
  });

  it("returns a pending request when the peer has not accepted yet", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1" } } }
    });
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: [
        {
          request_id: "request-1",
          status: "pending",
          conversation_id: null,
          peer_id: "peer-1"
        }
      ],
      error: null
    });

    await expect(requestDirectConversation("Peer_Name")).resolves.toEqual({
      requestId: "request-1",
      status: "pending",
      conversationId: null,
      peerId: "peer-1"
    });
  });

  it("falls back to deleting the conversation when the old destroy rpc is blocked by storage SQL", async () => {
    const deleteQuery = {
      delete: jest.fn(),
      eq: jest.fn()
    };
    deleteQuery.delete.mockReturnValue(deleteQuery);
    deleteQuery.eq.mockResolvedValue({ error: null });
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: {
        code: "42501",
        message: "Direct deletion from storage tables is not allowed. Use the Storage API instead."
      }
    });
    (supabase.from as jest.Mock).mockReturnValue(deleteQuery);

    await expect(destroyConversation("conversation-1")).resolves.toBeUndefined();

    expect(supabase.rpc).toHaveBeenCalledWith("destroy_conversation_for_everyone", { p_conversation_id: "conversation-1" });
    expect(supabase.from).toHaveBeenCalledWith("conversations");
    expect(deleteQuery.delete).toHaveBeenCalled();
    expect(deleteQuery.eq).toHaveBeenCalledWith("id", "conversation-1");
  });
});
