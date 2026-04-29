import type {
  DecryptFileParams,
  DecryptMessageParams,
  EncryptFileParams,
  EncryptMessageParams,
  EncryptedMessageEnvelope,
  OneTimePreKey,
  PublicDeviceBundle,
  PublicKeyPair,
  SignedPreKeyBundle
} from "./types";

export interface CryptoProvider {
  generateIdentityKeyPair(scope?: string): Promise<PublicKeyPair>;
  generateSignedPreKey(scope?: string): Promise<SignedPreKeyBundle>;
  generateOneTimePreKeys(count: number): Promise<OneTimePreKey[]>;
  encryptMessage(params: EncryptMessageParams): Promise<EncryptedMessageEnvelope>;
  decryptMessage(params: DecryptMessageParams): Promise<string>;
  encryptFile(params: EncryptFileParams): Promise<EncryptedMessageEnvelope>;
  decryptFile(params: DecryptFileParams): Promise<Uint8Array>;
  rotateKeys(scope?: string): Promise<PublicKeyPair>;
  exportPublicBundle(scope?: string): Promise<PublicDeviceBundle>;
  getDeviceId(): Promise<string | null>;
}
