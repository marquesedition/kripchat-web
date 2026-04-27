import { decryptMessageRecord } from "@/features/chat/chatService";
import { deriveConversationSharedKey } from "@/lib/e2ee";

jest.mock("@/lib/antiSpam", () => ({
  canSendMessage: jest.fn(() => true)
}));

jest.mock("@/lib/cryptoPayload", () => ({
  decryptBlobForConversation: jest.fn(),
  decryptTextForConversation: jest.fn((value: string, _conversationId: string, sharedKey?: Uint8Array | null) =>
    sharedKey ? `dec:${value}` : "[encrypted packet]"
  ),
  encryptBlobForConversation: jest.fn(),
  encryptTextForConversation: jest.fn((value: string) => `enc:${value}`)
}));

jest.mock("@/lib/e2ee", () => ({
  deriveConversationSharedKey: jest.fn(async () => new Uint8Array([1, 2, 3]))
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(),
    storage: {
      from: jest.fn()
    }
  }
}));

describe("decryptMessageRecord resilience", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("does not throw when shared key derivation fails", async () => {
    (deriveConversationSharedKey as jest.Mock).mockRejectedValue(new Error("bad peer key"));

    await expect(
      decryptMessageRecord(
        {
          id: "m1",
          conversation_id: "c1",
          sender_id: "peer-1",
          body: "krypchat:v2:payload",
          client_id: null,
          status: "sent",
          kind: "text",
          attachment_path: null,
          attachment_name: null,
          attachment_mime: null,
          attachment_size: null,
          location_lat: null,
          location_lng: null,
          location_label: null,
          created_at: "2026-04-27T18:00:00.000Z"
        },
        "user-1",
        "invalid-peer-key"
      )
    ).resolves.toMatchObject({
      body: "[encrypted packet]"
    });
  });
});
