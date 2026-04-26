import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import nacl from "tweetnacl";
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from "tweetnacl-util";

const IDENTITY_STORAGE_PREFIX = "krypchat.e2ee.identity.v1";
const SHARED_KEY_DOMAIN = "krypchat-e2ee.shared-key.v1";

export type E2EEIdentity = {
  version: 1;
  publicKey: string;
  secretKey: string;
  createdAt: string;
};

export async function ensureE2EEIdentity(userId: string): Promise<E2EEIdentity> {
  const existing = await readIdentity(userId);
  if (existing) return existing;

  const keyPair = nacl.box.keyPair();
  const created = {
    version: 1 as const,
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
    createdAt: new Date().toISOString()
  };

  await writeIdentity(userId, created);
  return created;
}

export async function deriveConversationSharedKey(userId: string, peerPublicKey: string, conversationId: string) {
  const identity = await ensureE2EEIdentity(userId);
  const sharedSecret = nacl.box.before(decodeBase64(peerPublicKey), decodeBase64(identity.secretKey));
  const scope = decodeUTF8(`${SHARED_KEY_DOMAIN}:${conversationId}`);
  const material = new Uint8Array(sharedSecret.length + scope.length);
  material.set(sharedSecret);
  material.set(scope, sharedSecret.length);
  return nacl.hash(material).slice(0, nacl.secretbox.keyLength);
}

export function encryptTextWithSharedKey(plainText: string, sharedKey: Uint8Array) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const plaintext = decodeUTF8(plainText);
  const ciphertext = nacl.secretbox(plaintext, nonce, sharedKey);
  return `krypchat:v2:${encodeBase64(nonce)}.${encodeBase64(ciphertext)}`;
}

export function decryptTextWithSharedKey(value: string, sharedKey: Uint8Array) {
  if (!value.startsWith("krypchat:v2:")) return null;

  try {
    const payload = value.slice("krypchat:v2:".length);
    const [nonceBase64, ciphertextBase64] = payload.split(".");
    if (!nonceBase64 || !ciphertextBase64) return "[encrypted packet]";
    const nonce = decodeBase64(nonceBase64);
    const ciphertext = decodeBase64(ciphertextBase64);
    const opened = nacl.secretbox.open(ciphertext, nonce, sharedKey);
    if (!opened) return "[encrypted packet]";
    return encodeUTF8(opened);
  } catch {
    return "[encrypted packet]";
  }
}

export function isV2EncryptedEnvelope(value: string) {
  return value.startsWith("krypchat:v2:");
}

async function readIdentity(userId: string) {
  const raw = await readDeviceSecret(`${IDENTITY_STORAGE_PREFIX}:${userId}`);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as E2EEIdentity;
    if (parsed.publicKey && parsed.secretKey) return parsed;
  } catch {
    return null;
  }

  return null;
}

async function writeIdentity(userId: string, identity: E2EEIdentity) {
  await writeDeviceSecret(`${IDENTITY_STORAGE_PREFIX}:${userId}`, JSON.stringify(identity));
}

async function readDeviceSecret(key: string) {
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

async function writeDeviceSecret(key: string, value: string) {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}
