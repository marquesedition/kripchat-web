import CryptoJS from "crypto-js";

const ENVELOPE_PREFIX = "krypchat:v1:";
const KEY_DOMAIN = "krypchat-conversation-payload-v1";

export function encryptTextForConversation(plainText: string, conversationId: string) {
  const ciphertext = CryptoJS.AES.encrypt(plainText, deriveConversationKey(conversationId)).toString();
  return `${ENVELOPE_PREFIX}${ciphertext}`;
}

export function decryptTextForConversation(value: string, conversationId: string) {
  if (!value.startsWith(ENVELOPE_PREFIX)) return value;

  try {
    const ciphertext = value.slice(ENVELOPE_PREFIX.length);
    const bytes = CryptoJS.AES.decrypt(ciphertext, deriveConversationKey(conversationId));
    return bytes.toString(CryptoJS.enc.Utf8) || "[encrypted packet]";
  } catch {
    return "[encrypted packet]";
  }
}

export async function encryptBlobForConversation(blob: Blob, conversationId: string) {
  const base64 = await blobToBase64(blob);
  const encrypted = encryptTextForConversation(base64, conversationId);
  return new Blob([encrypted], { type: "application/octet-stream" });
}

export async function decryptBlobForConversation(encryptedBlob: Blob, conversationId: string, mimeType: string) {
  const encryptedText = await encryptedBlob.text();
  if (!isEncryptedEnvelope(encryptedText)) return encryptedBlob;
  const base64 = decryptTextForConversation(encryptedText, conversationId);
  return base64ToBlob(base64, mimeType);
}

export function isEncryptedEnvelope(value: string) {
  return value.startsWith(ENVELOPE_PREFIX);
}

function deriveConversationKey(conversationId: string) {
  return CryptoJS.SHA256(`${KEY_DOMAIN}:${conversationId}`).toString(CryptoJS.enc.Hex);
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Unable to read secure payload"));
    reader.onload = () => {
      const value = String(reader.result ?? "");
      resolve(value.includes(",") ? value.split(",")[1] : value);
    };
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mimeType: string) {
  const byteString = atob(base64);
  const chunks: ArrayBuffer[] = [];
  const chunkSize = 1024;

  for (let offset = 0; offset < byteString.length; offset += chunkSize) {
    const slice = byteString.slice(offset, offset + chunkSize);
    const bytes = new Uint8Array(slice.length);
    for (let index = 0; index < slice.length; index += 1) {
      bytes[index] = slice.charCodeAt(index);
    }
    chunks.push(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }

  return new Blob(chunks, { type: mimeType });
}
