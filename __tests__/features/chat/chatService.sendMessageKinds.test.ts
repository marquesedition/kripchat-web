import { sendMessage } from "@/features/chat/chatService";
import { supabase } from "@/lib/supabase";
import { canSendMessage } from "@/lib/antiSpam";
import { localCryptoProvider } from "@/src/lib/crypto";

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
  deriveConversationSharedKey: jest.fn(async () => new Uint8Array([1, 2, 3, 4])),
  ensureE2EEIdentity: jest.fn(async () => ({ publicKey: "local-public", secretKey: "local-secret", version: 1, createdAt: "now" })),
  isV2EncryptedEnvelope: jest.fn((value: string) => value.startsWith("krypchat:v2:"))
}));

jest.mock("@/src/lib/crypto", () => ({
  localCryptoProvider: {
    encryptMessage: jest.fn(async (params) => ({
      ciphertext: `enc:${params.plaintext}:${params.recipientDeviceId}`,
      cryptoMetadata: {
        algorithm: "kripchat-nacl-box-dev-v1",
        nonce: "nonce",
        senderPublicKey: "sender-public",
        senderDeviceId: params.senderDeviceId,
        recipientDeviceId: params.recipientDeviceId,
        warning: "test"
      }
    })),
    decryptMessage: jest.fn(async (params) => `dec:${params.ciphertext}`)
  }
}));

jest.mock("@/src/lib/supabase/devices", () => ({
  registerCurrentDevice: jest.fn(async () => ({
    id: "sender-device",
    user_id: "user-1",
    device_name: "Test",
    public_identity_key: "sender-public",
    public_signed_prekey: null,
    created_at: "now",
    last_seen_at: "now",
    revoked_at: null
  })),
  getUserDevices: jest.fn(async (userId: string) =>
    userId === "peer-1"
      ? [
          {
            id: "peer-device",
            user_id: "peer-1",
            device_name: "Peer",
            public_identity_key: "peer-public-key",
            public_signed_prekey: null,
            created_at: "now",
            last_seen_at: "now",
            revoked_at: null
          }
        ]
      : [
          {
            id: "sender-device",
            user_id: "user-1",
            device_name: "Test",
            public_identity_key: "sender-public",
            public_signed_prekey: null,
            created_at: "now",
            last_seen_at: "now",
            revoked_at: null
          }
        ]
  )
}));

jest.mock("@/src/lib/storage/secureStorage", () => ({
  getDeviceId: jest.fn(async () => "sender-device")
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
      if (table === "profiles") {
        const profilesQuery = {
          update: jest.fn()
        };
        profilesQuery.update.mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        });
        return profilesQuery;
      }

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

      if (table === "encrypted_messages") {
        const messagesTable = {
          insert: jest.fn((payload: Array<Record<string, unknown>>) => {
            insertPayloads.push(...payload);
            return {
              select: jest.fn().mockResolvedValue({
                data: payload.map((row, index) => ({
                  id: `message-${index}`,
                  created_at: "2026-04-27T16:50:00.000Z",
                  sent_at: "2026-04-27T16:50:00.000Z",
                  delivered_at: null,
                  read_at: null,
                  deleted_for_all_at: null,
                  ...row
                })),
                error: null
              })
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
    expect(insertPayloads).toHaveLength(2);
    expect(insertPayloads[0].ciphertext).toContain("enc:hello world");
    expect(insertPayloads[0].message_type).toBe("text");
    expect(localCryptoProvider.encryptMessage).toHaveBeenCalledWith(expect.objectContaining({ plaintext: "hello world" }));
  });

  it("sends image messages with fallback body when empty", async () => {
    await sendMessage("conversation-1", "user-1", { body: " ", kind: "image", attachmentName: "pic.jpg" }, "client-2");
    expect(insertPayloads[0].ciphertext).toContain("enc:[image] pic.jpg");
    expect(insertPayloads[0].message_type).toBe("image");
  });

  it("sends video messages with fallback body when empty", async () => {
    await sendMessage("conversation-1", "user-1", { body: "", kind: "video", attachmentName: "clip.mp4" }, "client-3");
    expect(insertPayloads[0].ciphertext).toContain("enc:[video] clip.mp4");
    expect(insertPayloads[0].message_type).toBe("video");
  });

  it("sends audio messages with fallback body when empty", async () => {
    await sendMessage("conversation-1", "user-1", { body: "", kind: "audio", attachmentName: "voice.m4a" }, "client-4");
    expect(insertPayloads[0].ciphertext).toContain("enc:[audio] voice.m4a");
    expect(insertPayloads[0].message_type).toBe("audio");
  });

  it("sends document messages with fallback body when empty", async () => {
    await sendMessage("conversation-1", "user-1", { body: "", kind: "document", attachmentName: "report.pdf" }, "client-5");
    expect(insertPayloads[0].ciphertext).toContain("enc:[document] report.pdf");
    expect(insertPayloads[0].message_type).toBe("document");
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

    expect(insertPayloads[0].ciphertext).toContain("enc:[location] secure coordinates");
    expect(insertPayloads[0].message_type).toBe("location");
    expect(insertPayloads[0].crypto_metadata).toMatchObject({
      locationLabel: "HQ Madrid",
      locationLat: 40.4168,
      locationLng: -3.7038
    });
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

  it("uses device encryption helper to protect payload body", async () => {
    await sendMessage("conversation-1", "user-1", { body: "encrypted body", kind: "text" }, "client-10");
    expect(localCryptoProvider.encryptMessage).toHaveBeenCalledWith(expect.objectContaining({ plaintext: "encrypted body" }));
  });
});
