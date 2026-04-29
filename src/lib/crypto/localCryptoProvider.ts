import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from "tweetnacl-util";
import { getDeviceId, getPrivateKey, savePrivateKey } from "@/src/lib/storage/secureStorage";
import type { CryptoProvider } from "./CryptoProvider";
import type {
  DecryptFileParams,
  DecryptMessageParams,
  EncryptFileParams,
  EncryptMessageParams,
  EncryptedMessageEnvelope,
  OneTimePreKey,
  PublicKeyPair
} from "./types";

const DEFAULT_SCOPE = "identity";
const PUBLIC_KEY_PREFIX = "kripchat.public-key.v1";
const PLACEHOLDER_WARNING = "Replace with audited Signal Protocol implementation before production.";

function createKeyPair(): PublicKeyPair {
  const keyPair = nacl.box.keyPair();
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    privateKey: encodeBase64(keyPair.secretKey)
  };
}

async function saveIdentity(scope: string, keyPair: PublicKeyPair) {
  await savePrivateKey(scope, keyPair.privateKey);
  if (typeof localStorage !== "undefined" && typeof localStorage.setItem === "function") {
    localStorage.setItem(`${PUBLIC_KEY_PREFIX}:${scope}`, keyPair.publicKey);
  }
}

async function readPublicKey(scope: string) {
  if (typeof localStorage === "undefined" || typeof localStorage.getItem !== "function") return null;
  return localStorage.getItem(`${PUBLIC_KEY_PREFIX}:${scope}`);
}

async function requirePrivateKey(scope: string) {
  const privateKey = await getPrivateKey(scope);
  if (!privateKey) {
    throw new Error("Device private key is missing. Re-register this device.");
  }
  return privateKey;
}

async function ensureIdentity(scope = DEFAULT_SCOPE) {
  const privateKey = await getPrivateKey(scope);
  const publicKey = await readPublicKey(scope);
  if (privateKey && publicKey) return { publicKey, privateKey };
  return localCryptoProvider.generateIdentityKeyPair(scope);
}

function buildEnvelope(params: EncryptMessageParams | EncryptFileParams, ciphertext: Uint8Array, nonce: Uint8Array, senderPublicKey: string): EncryptedMessageEnvelope {
  const senderDeviceId = "senderDeviceId" in params ? params.senderDeviceId : "attachment";
  const recipientDeviceId = "recipientDeviceId" in params ? params.recipientDeviceId : "attachment";
  return {
    ciphertext: encodeBase64(ciphertext),
    cryptoMetadata: {
      algorithm: "kripchat-nacl-box-dev-v1",
      nonce: encodeBase64(nonce),
      senderPublicKey,
      senderDeviceId,
      recipientDeviceId,
      warning: PLACEHOLDER_WARNING
    }
  };
}

export const localCryptoProvider: CryptoProvider = {
  async generateIdentityKeyPair(scope = DEFAULT_SCOPE) {
    const keyPair = createKeyPair();
    await saveIdentity(scope, keyPair);
    return keyPair;
  },

  async generateSignedPreKey(scope = "signed-prekey") {
    const keyPair = createKeyPair();
    await savePrivateKey(scope, keyPair.privateKey);
    return {
      ...keyPair,
      keyId: `${Date.now()}`
    };
  },

  async generateOneTimePreKeys(count) {
    return Array.from({ length: count }, (_, index): OneTimePreKey => ({
      ...createKeyPair(),
      keyId: `${Date.now()}-${index}`
    }));
  },

  async encryptMessage(params) {
    const identity = await ensureIdentity(params.senderDeviceId);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const ciphertext = nacl.box(
      decodeUTF8(params.plaintext),
      nonce,
      decodeBase64(params.recipientPublicKey),
      decodeBase64(identity.privateKey)
    );
    return buildEnvelope(params, ciphertext, nonce, identity.publicKey);
  },

  async decryptMessage(params: DecryptMessageParams) {
    const scope = params.deviceScope ?? (await getDeviceId()) ?? DEFAULT_SCOPE;
    const privateKey = await requirePrivateKey(scope);
    const opened = nacl.box.open(
      decodeBase64(params.ciphertext),
      decodeBase64(params.nonce),
      decodeBase64(params.senderPublicKey),
      decodeBase64(privateKey)
    );
    if (!opened) throw new Error("Unable to decrypt message for this device.");
    return encodeUTF8(opened);
  },

  async encryptFile(params: EncryptFileParams) {
    const identity = await ensureIdentity();
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const ciphertext = nacl.box(params.bytes, nonce, decodeBase64(params.recipientPublicKey), decodeBase64(identity.privateKey));
    return buildEnvelope(params, ciphertext, nonce, identity.publicKey);
  },

  async decryptFile(params: DecryptFileParams) {
    const scope = params.deviceScope ?? (await getDeviceId()) ?? DEFAULT_SCOPE;
    const privateKey = await requirePrivateKey(scope);
    const opened = nacl.box.open(
      decodeBase64(params.ciphertext),
      decodeBase64(params.nonce),
      decodeBase64(params.senderPublicKey),
      decodeBase64(privateKey)
    );
    if (!opened) throw new Error("Unable to decrypt file for this device.");
    return opened;
  },

  async rotateKeys(scope = DEFAULT_SCOPE) {
    return this.generateIdentityKeyPair(scope);
  },

  async exportPublicBundle(scope = DEFAULT_SCOPE) {
    const identity = await ensureIdentity(scope);
    return {
      deviceId: await getDeviceId(),
      publicIdentityKey: identity.publicKey
    };
  },

  getDeviceId
};
