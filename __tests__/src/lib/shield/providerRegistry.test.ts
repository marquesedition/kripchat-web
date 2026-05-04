import {
  assertCryptoProviderAvailableForStack,
  assertPreferredCryptoProviderAvailable,
  getShieldCryptoProvider,
  registerShieldCryptoProvider,
  resetShieldCryptoProviderForTests,
  setPreferredCryptoStack,
  type ShieldCryptoProvider
} from "@/src/lib/shield";

const readyProvider: ShieldCryptoProvider = {
  providerId: "test-shield-provider",
  productionReady: true,
  async generateDeviceBundle(input) {
    return {
      version: 1,
      userId: input.userId,
      deviceId: input.deviceId,
      identityKey: "identity",
      signedPreKey: {
        keyId: "signed-1",
        publicKey: "signed-public",
        signature: "signature"
      }
    };
  },
  async establishSession(input) {
    const now = new Date().toISOString();
    return {
      version: 1,
      conversationId: input.conversationId,
      localUserId: input.localUserId,
      localDeviceId: input.localDeviceId,
      remoteUserId: input.remoteBundle.userId,
      remoteDeviceId: input.remoteBundle.deviceId,
      sessionId: "session-1",
      ratchetEpoch: 1,
      createdAt: now,
      updatedAt: now,
      providerId: "test-shield-provider"
    };
  },
  async encryptMessage() {
    throw new Error("not needed in provider registry tests");
  },
  async decryptMessage() {
    throw new Error("not needed in provider registry tests");
  },
  async rotateDeviceKeys(input) {
    return this.generateDeviceBundle(input);
  }
};

describe("Shield provider registry", () => {
  beforeEach(() => {
    resetShieldCryptoProviderForTests();
  });

  afterAll(() => {
    resetShieldCryptoProviderForTests();
  });

  it("starts unavailable and fails closed", () => {
    expect(getShieldCryptoProvider().productionReady).toBe(false);
    expect(() => assertCryptoProviderAvailableForStack("kripchat-shield-v1")).toThrow("no production Shield provider");
  });

  it("allows Shield once a production provider is registered", async () => {
    registerShieldCryptoProvider(readyProvider);
    await setPreferredCryptoStack("kripchat-shield-v1");

    expect(getShieldCryptoProvider().providerId).toBe("test-shield-provider");
    await expect(assertPreferredCryptoProviderAvailable()).resolves.toBeUndefined();
  });
});
