const mockSecrets = new Map<string, string>();
let mockCurrentDeviceId: string | null = null;

jest.mock("@/src/lib/storage/secureStorage", () => ({
  savePrivateKey: jest.fn(async (scope: string, privateKey: string) => {
    mockSecrets.set(scope, privateKey);
  }),
  getPrivateKey: jest.fn(async (scope: string) => mockSecrets.get(scope) ?? null),
  deletePrivateKey: jest.fn(async (scope: string) => {
    mockSecrets.delete(scope);
  }),
  saveDeviceId: jest.fn(async (deviceId: string) => {
    mockCurrentDeviceId = deviceId;
  }),
  getDeviceId: jest.fn(async () => mockCurrentDeviceId),
  clearSecureStorage: jest.fn(async () => {
    mockSecrets.clear();
    mockCurrentDeviceId = null;
  })
}));

import { localCryptoProvider } from "@/src/lib/crypto/localCryptoProvider";

describe("localCryptoProvider", () => {
  beforeEach(() => {
    mockSecrets.clear();
    mockCurrentDeviceId = null;
  });

  it("decrypts an encrypted message back to the original plaintext", async () => {
    const recipient = await localCryptoProvider.generateIdentityKeyPair("recipient-device");

    const encrypted = await localCryptoProvider.encryptMessage({
      plaintext: "hello private world",
      recipientPublicKey: recipient.publicKey,
      senderUserId: "sender-user",
      senderDeviceId: "sender-device",
      recipientUserId: "recipient-user",
      recipientDeviceId: "recipient-device"
    });

    await expect(
      localCryptoProvider.decryptMessage({
        ciphertext: encrypted.ciphertext,
        senderPublicKey: encrypted.cryptoMetadata.senderPublicKey,
        nonce: encrypted.cryptoMetadata.nonce,
        deviceScope: "recipient-device"
      })
    ).resolves.toBe("hello private world");
  });

  it("marks the development crypto envelope as a non-production placeholder", async () => {
    const recipient = await localCryptoProvider.generateIdentityKeyPair("recipient-device");
    const encrypted = await localCryptoProvider.encryptMessage({
      plaintext: "no plaintext in transport",
      recipientPublicKey: recipient.publicKey,
      senderUserId: "sender-user",
      senderDeviceId: "sender-device",
      recipientUserId: "recipient-user",
      recipientDeviceId: "recipient-device"
    });

    expect(encrypted.ciphertext).not.toContain("no plaintext in transport");
    expect(encrypted.cryptoMetadata.warning).toContain("Replace with audited Signal Protocol");
  });
});
