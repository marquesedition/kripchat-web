import { markAsRead, sendEncryptedMessage } from "@/src/lib/supabase/messages";
import { isUserBlocked } from "@/src/lib/supabase/blocks";
import { localCryptoProvider } from "@/src/lib/crypto";
import { supabase } from "@/src/lib/supabase/client";
import { setKripChatRuntimeOverrideForTests, setPreferredCryptoStack } from "@/src/lib/shield";

jest.mock("@/src/lib/supabase/client", () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock("@/src/lib/supabase/blocks", () => ({
  isUserBlocked: jest.fn(async () => false)
}));

jest.mock("@/src/lib/crypto", () => ({
  localCryptoProvider: {
    encryptMessage: jest.fn(async () => ({
      ciphertext: "ciphertext-only",
      cryptoMetadata: {
        algorithm: "kripchat-nacl-box-dev-v1",
        nonce: "nonce",
        senderPublicKey: "sender-public",
        senderDeviceId: "sender-device",
        recipientDeviceId: "recipient-device",
        warning: "Replace with audited Signal Protocol implementation before production."
      }
    }))
  }
}));

describe("device encrypted message service", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    (isUserBlocked as jest.Mock).mockResolvedValue(false);
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_KRIPCHAT_CRYPTO_STACK;
    setKripChatRuntimeOverrideForTests(null);
  });

  afterAll(() => {
    process.env = originalEnv;
    setKripChatRuntimeOverrideForTests(null);
  });

  it("inserts ciphertext and never inserts plaintext", async () => {
    const insert = jest.fn((payload) => ({
      select: jest.fn(() => ({
        single: jest.fn(async () => ({ data: { id: "message-1", ...payload }, error: null }))
      }))
    }));
    (supabase.from as jest.Mock).mockReturnValue({ insert });

    await sendEncryptedMessage({
      conversationId: "conversation-1",
      senderUserId: "sender-user",
      senderDeviceId: "sender-device",
      recipientUserId: "recipient-user",
      recipientDeviceId: "recipient-device",
      recipientPublicKey: "recipient-public",
      plaintext: "super secret text"
    });

    expect(localCryptoProvider.encryptMessage).toHaveBeenCalledWith(expect.objectContaining({ plaintext: "super secret text" }));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ ciphertext: "ciphertext-only" }));
    expect(JSON.stringify(insert.mock.calls[0][0])).not.toContain("super secret text");
  });

  it("blocks sends to users blocked by the current account", async () => {
    (isUserBlocked as jest.Mock).mockResolvedValue(true);

    await expect(
      sendEncryptedMessage({
        conversationId: "conversation-1",
        senderUserId: "sender-user",
        senderDeviceId: "sender-device",
        recipientUserId: "recipient-user",
        recipientDeviceId: "recipient-device",
        recipientPublicKey: "recipient-public",
        plaintext: "hello"
      })
    ).rejects.toThrow("Cannot send messages to a blocked user.");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("fails closed when Shield crypto is selected before the provider exists", async () => {
    await setPreferredCryptoStack("kripchat-shield-v1");

    await expect(
      sendEncryptedMessage({
        conversationId: "conversation-1",
        senderUserId: "sender-user",
        senderDeviceId: "sender-device",
        recipientUserId: "recipient-user",
        recipientDeviceId: "recipient-device",
        recipientPublicKey: "recipient-public",
        plaintext: "hello"
      })
    ).rejects.toThrow("no production Shield provider");

    expect(localCryptoProvider.encryptMessage).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("does not write read_at when read receipts are disabled", async () => {
    await expect(markAsRead("message-1", false)).resolves.toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
