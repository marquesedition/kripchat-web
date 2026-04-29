export type PublicKeyPair = {
  publicKey: string;
  privateKey: string;
};

export type SignedPreKeyBundle = PublicKeyPair & {
  keyId: string;
  signature?: string;
};

export type OneTimePreKey = PublicKeyPair & {
  keyId: string;
};

export type EncryptMessageParams = {
  plaintext: string;
  recipientPublicKey: string;
  senderUserId: string;
  senderDeviceId: string;
  recipientUserId: string;
  recipientDeviceId: string;
};

export type EncryptedMessageEnvelope = {
  ciphertext: string;
  cryptoMetadata: {
    algorithm: "kripchat-nacl-box-dev-v1";
    nonce: string;
    senderPublicKey: string;
    senderDeviceId: string;
    recipientDeviceId: string;
    warning: string;
  };
};

export type DecryptMessageParams = {
  ciphertext: string;
  senderPublicKey: string;
  nonce: string;
  deviceScope?: string;
};

export type EncryptFileParams = {
  bytes: Uint8Array;
  recipientPublicKey: string;
  metadata?: Record<string, unknown>;
};

export type DecryptFileParams = {
  ciphertext: string;
  senderPublicKey: string;
  nonce: string;
  deviceScope?: string;
};

export type PublicDeviceBundle = {
  deviceId: string | null;
  publicIdentityKey: string;
  publicSignedPreKey?: string;
};
