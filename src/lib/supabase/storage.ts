import { localCryptoProvider } from "@/src/lib/crypto";
import { decodeBase64 } from "tweetnacl-util";
import { supabase } from "./client";

const BUCKET = "encrypted-attachments";

export async function uploadEncryptedAttachment(input: {
  conversationId: string;
  recipientPublicKey: string;
  bytes: Uint8Array;
  fileName: string;
  contentType?: string;
}) {
  const encrypted = await localCryptoProvider.encryptFile({ bytes: input.bytes, recipientPublicKey: input.recipientPublicKey });
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${input.conversationId}/${Date.now()}-${safeName}.enc`;
  const encryptedBytes = decodeBase64(encrypted.ciphertext);
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, encryptedBytes, {
    contentType: "application/octet-stream",
    upsert: false
  });
  if (error) throw error;
  return { path: data.path, cryptoMetadata: encrypted.cryptoMetadata, originalContentType: input.contentType ?? "application/octet-stream" };
}

export async function downloadEncryptedAttachment(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}
