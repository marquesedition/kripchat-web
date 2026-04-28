import { sendMessage } from "@/features/chat/chatService";
import { supabase } from "@/lib/supabase";
import { canSendMessage } from "@/lib/antiSpam";
import { encryptLegacyTextForConversation, encryptTextForConversation } from "@/lib/cryptoPayload";
import { deriveConversationSharedKey } from "@/lib/e2ee";

jest.mock("@/lib/antiSpam", () => ({
  canSendMessage: jest.fn(() => true)
}));

jest.mock("@/lib/cryptoPayload", () => ({
  decryptBlobForConversation: jest.fn(),
  decryptTextForConversation: jest.fn((value: string) => value),
  encryptBlobForConversation: jest.fn(),
  encryptLegacyTextForConversation: jest.fn((value: string) => `legacy:${value}`),
  encryptTextForConversation: jest.fn((value: string) => `enc:${value}`)
}));

jest.mock("@/lib/e2ee", () => ({
  deriveConversationSharedKey: jest.fn(async () => new Uint8Array([1, 2, 3, 4]))
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe("sendMessage payloads by message kind", () => {
  const insertPayloads: Array<Record<string, unknown>> = [];

  function setupSupabase(peerPublicKey: string | null = "peer-public-key") {
    insertPayloads.length = 0;

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "conversation_participants") {
        const participantsQuery = {
          select: jest.fn(),
          eq: jest.fn()
        };
        participantsQuery.select.mockReturnValue(participantsQuery);
        participantsQuery.eq.mockResolvedValue({
          data: [
            {
              profile_id: "peer-1",
              profile: {
                id: "peer-1",
                e2ee_public_key: peerPublicKey
              }
            }
          ],
          error: null
        });
        return participantsQuery;
      }

      if (table === "messages") {
        const messagesTable = {
          insert: jest.fn((payload: Record<string, unknown>) => {
            insertPayloads.push(payload);
            return {
              select: jest.fn(() => ({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: "message-1",
                    created_at: "2026-04-27T16:50:00.000Z",
                    ...payload
                  },
                  error: null
                })
              }))
            };
          })
        };
        return messagesTable;
      }

      throw new Error(`Unexpected table access in test: ${table}`);
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (canSendMessage as jest.Mock).mockReturnValue(true);
    setupSupabase();
  });

  it("sends text messages with sanitized body", async () => {
    const result = await sendMessage("conversation-1", "user-1", { body: "  hello   world  " }, "client-1");

    expect(result.optimistic.body).toBe("hello world");
    expect(insertPayloads[0].body).toBe("enc:hello world");
    expect(insertPayloads[0].kind).toBe("text");
    expect(insertPayloads[0].location_label).toBeNull();
    expect(deriveConversationSharedKey).toHaveBeenCalledWith("user-1", "peer-public-key", "conversation-1");
  });

  it("sends image messages with fallback body when empty", async () => {
    await sendMessage("conversation-1", "user-1", { body: " ", kind: "image", attachmentName: "pic.jpg" }, "client-2");
    expect(insertPayloads[0].body).toBe("enc:[image] pic.jpg");
    expect(insertPayloads[0].kind).toBe("image");
  });

  it("sends video messages with fallback body when empty", async () => {
    await sendMessage("conversation-1", "user-1", { body: "", kind: "video", attachmentName: "clip.mp4" }, "client-3");
    expect(insertPayloads[0].body).toBe("enc:[video] clip.mp4");
    expect(insertPayloads[0].kind).toBe("video");
  });

  it("sends audio messages with fallback body when empty", async () => {
    await sendMessage("conversation-1", "user-1", { body: "", kind: "audio", attachmentName: "voice.m4a" }, "client-4");
    expect(insertPayloads[0].body).toBe("enc:[audio] voice.m4a");
    expect(insertPayloads[0].kind).toBe("audio");
  });

  it("sends document messages with fallback body when empty", async () => {
    await sendMessage("conversation-1", "user-1", { body: "", kind: "document", attachmentName: "report.pdf" }, "client-5");
    expect(insertPayloads[0].body).toBe("enc:[document] report.pdf");
    expect(insertPayloads[0].kind).toBe("document");
  });

  it("sends location messages with encrypted location label", async () => {
    await sendMessage(
      "conversation-1",
      "user-1",
      {
        body: "",
        kind: "location",
        locationLabel: "HQ Madrid",
        locationLat: 40.4168,
        locationLng: -3.7038
      },
      "client-6"
    );

    expect(insertPayloads[0].body).toBe("enc:[location] secure coordinates");
    expect(insertPayloads[0].kind).toBe("location");
    expect(insertPayloads[0].location_label).toBe("enc:HQ Madrid");
    expect(insertPayloads[0].location_lat).toBe(40.4168);
    expect(insertPayloads[0].location_lng).toBe(-3.7038);
  });

  it("rejects empty text messages", async () => {
    await expect(sendMessage("conversation-1", "user-1", { body: "   ", kind: "text" }, "client-7")).rejects.toThrow("Message is empty");
  });

  it("rejects sends when anti-spam throttle is full", async () => {
    (canSendMessage as jest.Mock).mockReturnValue(false);
    await expect(sendMessage("conversation-1", "user-1", { body: "hello", kind: "text" }, "client-8")).rejects.toThrow(
      "Slow down before sending another packet"
    );
  });

  it("falls back to legacy payload encryption when peer E2EE key is not available", async () => {
    setupSupabase(null);
    await sendMessage("conversation-1", "user-1", { body: "hello", kind: "text" }, "client-9");
    expect(insertPayloads[0].body).toBe("legacy:hello");
    expect(encryptLegacyTextForConversation).toHaveBeenCalledWith("hello", "conversation-1");
  });

  it("uses encryption helper to protect payload body", async () => {
    await sendMessage("conversation-1", "user-1", { body: "encrypted body", kind: "text" }, "client-10");
    expect(encryptTextForConversation).toHaveBeenCalledWith("encrypted body", expect.any(Uint8Array));
  });
});
