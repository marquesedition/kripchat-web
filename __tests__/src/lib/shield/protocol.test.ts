import {
  assertShieldCryptoProviderAvailable,
  buildShieldSessionId,
  getKripChatAppMode,
  getKripChatCryptoStack,
  getShieldPaddingBucket,
  KRIPCHAT_SHIELD_PROTOCOL,
  setKripChatRuntimeOverrideForTests
} from "@/src/lib/shield";

describe("KripChat Shield foundation", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_KRIPCHAT_APP_MODE;
    delete process.env.EXPO_PUBLIC_KRIPCHAT_CRYPTO_STACK;
    setKripChatRuntimeOverrideForTests(null);
  });

  afterAll(() => {
    process.env = originalEnv;
    setKripChatRuntimeOverrideForTests(null);
  });

  it("keeps the classic app and legacy crypto stack as the default runtime", () => {
    expect(getKripChatAppMode()).toBe("classic");
    expect(getKripChatCryptoStack()).toBe("legacy-device-envelope-v1");
  });

  it("defines Shield as a hybrid ratcheted protocol contract", () => {
    expect(KRIPCHAT_SHIELD_PROTOCOL.envelopeAlgorithm).toBe("kripchat-shield-v1");
    expect(KRIPCHAT_SHIELD_PROTOCOL.primitives).toEqual(
      expect.arrayContaining(["x25519", "ml-kem", "hkdf-sha256", "ed25519"])
    );
    expect(KRIPCHAT_SHIELD_PROTOCOL.nonGoals).toContain("inventing unaudited custom cryptographic primitives");
  });

  it("creates the same session id regardless of sender/recipient device order", () => {
    expect(
      buildShieldSessionId({
        conversationId: "conversation-1",
        localDeviceId: "device-b",
        remoteDeviceId: "device-a"
      })
    ).toBe(
      buildShieldSessionId({
        conversationId: "conversation-1",
        localDeviceId: "device-a",
        remoteDeviceId: "device-b"
      })
    );
  });

  it("pads plaintext sizes into fixed buckets", () => {
    expect(getShieldPaddingBucket(1)).toBe(256);
    expect(getShieldPaddingBucket(257)).toBe(1024);
    expect(getShieldPaddingBucket(4097)).toBe(16384);
  });

  it("fails closed if Shield crypto is requested before a provider is registered", () => {
    setKripChatRuntimeOverrideForTests({ cryptoStack: "kripchat-shield-v1" });
    expect(() => assertShieldCryptoProviderAvailable()).toThrow("no production Shield provider");
  });
});
