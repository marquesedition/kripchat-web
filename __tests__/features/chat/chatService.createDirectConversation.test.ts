import { createDirectConversation } from "@/features/chat/chatService";
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
  deriveConversationSharedKey: jest.fn()
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

describe("createDirectConversation guards and error translation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockProfileLookup(result: { data: unknown; error: unknown }) {
    const builder = {
      select: jest.fn(),
      eq: jest.fn(),
      neq: jest.fn(),
      maybeSingle: jest.fn()
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.neq.mockReturnValue(builder);
    builder.maybeSingle.mockResolvedValue(result);
    (supabase.from as jest.Mock).mockReturnValue(builder);
    return builder;
  }

  it("requires an authenticated session", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    await expect(createDirectConversation("user-1", "peer")).rejects.toThrow("Sign in before opening a channel.");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("requires a confirmed email", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1", email_confirmed_at: null } } }
    });

    await expect(createDirectConversation("user-1", "peer")).rejects.toThrow("Confirm your email before opening a channel.");
  });

  it("rejects empty usernames before querying Supabase", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1", email_confirmed_at: "2026-04-27T18:30:00Z" } } }
    });

    await expect(createDirectConversation("user-1", "   ")).rejects.toThrow("Enter a valid username.");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("maps RLS/permission lookup failures to a user-facing message", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1", email_confirmed_at: "2026-04-27T18:30:00Z" } } }
    });
    mockProfileLookup({
      data: null,
      error: {
        code: "42501",
        message: "permission denied",
        details: "row-level security policy"
      }
    });

    await expect(createDirectConversation("user-1", "Peer_Name")).rejects.toThrow(
      "Supabase blocked profile lookup. Sign in with a confirmed account and try again."
    );
  });

  it("opens the direct conversation when lookup and rpc succeed", async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: "user-1", email_confirmed_at: "2026-04-27T18:30:00Z" } } }
    });
    const query = mockProfileLookup({
      data: { id: "peer-1" },
      error: null
    });
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: "conversation-1",
      error: null
    });

    await expect(createDirectConversation("user-1", "Peer_Name")).resolves.toBe("conversation-1");
    expect(query.eq).toHaveBeenCalledWith("username", "peer_name");
    expect(supabase.rpc).toHaveBeenCalledWith("create_direct_conversation", { peer_id: "peer-1" });
  });
});
