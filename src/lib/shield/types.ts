export type KripChatAppMode = "classic" | "shield";

export type KripChatCryptoStack = "legacy-device-envelope-v1" | "kripchat-shield-v1";

export type ShieldPrimitive = "x25519" | "ml-kem" | "hkdf-sha256" | "aes-256-gcm" | "xchacha20-poly1305" | "ed25519";

export type ShieldSessionState = {
  version: 1;
  conversationId: string;
  localUserId: string;
  localDeviceId: string;
  remoteUserId: string;
  remoteDeviceId: string;
  sessionId: string;
  ratchetEpoch: number;
  createdAt: string;
  updatedAt: string;
};

export type ShieldPublicPreKeyBundle = {
  version: 1;
  userId: string;
  deviceId: string;
  identityKey: string;
  signedPreKey: {
    keyId: string;
    publicKey: string;
    signature: string;
  };
  oneTimePreKey?: {
    keyId: string;
    publicKey: string;
  };
  pqKemPreKey?: {
    keyId: string;
    publicKey: string;
    algorithm: "ml-kem-768";
  };
};

export type ShieldEnvelopeMetadata = {
  algorithm: "kripchat-shield-v1";
  mode: "hybrid-signal-ratchet";
  sessionId: string;
  senderUserId: string;
  senderDeviceId: string;
  recipientUserId: string;
  recipientDeviceId: string;
  ratchetEpoch: number;
  messageNumber: number;
  previousChainLength: number;
  primitives: ShieldPrimitive[];
  pqHybrid: boolean;
  padding: "fixed-bucket-v1";
};
