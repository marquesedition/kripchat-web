import type {
  ShieldEncryptedEnvelope,
  ShieldPlaintextMessage,
  ShieldPublicPreKeyBundle,
  ShieldSessionInput,
  ShieldSessionState
} from "./types";

export interface ShieldCryptoProvider {
  readonly providerId: string;
  readonly productionReady: boolean;
  generateDeviceBundle(input: { userId: string; deviceId: string }): Promise<ShieldPublicPreKeyBundle>;
  establishSession(input: ShieldSessionInput): Promise<ShieldSessionState>;
  encryptMessage(input: ShieldPlaintextMessage): Promise<ShieldEncryptedEnvelope>;
  decryptMessage(input: { envelope: ShieldEncryptedEnvelope; localDeviceId: string }): Promise<string>;
  rotateDeviceKeys(input: { userId: string; deviceId: string }): Promise<ShieldPublicPreKeyBundle>;
}
