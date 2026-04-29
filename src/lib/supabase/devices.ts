import { localCryptoProvider } from "@/src/lib/crypto";
import { getDeviceId, saveDeviceId } from "@/src/lib/storage/secureStorage";
import { supabase } from "./client";

export type DeviceRecord = {
  id: string;
  user_id: string;
  device_name: string | null;
  public_identity_key: string;
  public_signed_prekey: string | null;
  created_at: string;
  last_seen_at: string | null;
  revoked_at: string | null;
};

export async function registerCurrentDevice(userId: string, deviceName = "Current device") {
  let deviceId = await getDeviceId();
  deviceId = deviceId ?? createClientUuid();
  const identity = await localCryptoProvider.generateIdentityKeyPair(deviceId ?? undefined);
  const signedPreKey = await localCryptoProvider.generateSignedPreKey(`${deviceId ?? "pending"}:signed-prekey`);

  const payload = {
    id: deviceId,
    user_id: userId,
    device_name: deviceName,
    public_identity_key: identity.publicKey,
    public_signed_prekey: signedPreKey.publicKey,
    last_seen_at: new Date().toISOString(),
    revoked_at: null
  };

  const { data, error } = await supabase.from("devices").upsert(payload).select("*").single();
  if (error) throw error;
  deviceId = (data as DeviceRecord).id;
  await saveDeviceId(deviceId);
  return data as DeviceRecord;
}

export async function getMyDevices(userId: string) {
  const { data, error } = await supabase.from("devices").select("*").eq("user_id", userId).is("revoked_at", null).order("created_at");
  if (error) throw error;
  return (data ?? []) as DeviceRecord[];
}

export async function getUserDevices(userId: string) {
  const { data, error } = await supabase
    .from("devices")
    .select("id, user_id, device_name, public_identity_key, public_signed_prekey, created_at, last_seen_at, revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as DeviceRecord[];
}

export async function revokeDevice(deviceId: string) {
  const { data, error } = await supabase
    .from("devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", deviceId)
    .select("*")
    .single();
  if (error) throw error;
  return data as DeviceRecord;
}

export async function uploadPreKeys(deviceId: string, count = 20) {
  const prekeys = await localCryptoProvider.generateOneTimePreKeys(count);
  const { data, error } = await supabase
    .from("prekeys")
    .insert(prekeys.map((key) => ({ device_id: deviceId, key_id: key.keyId, public_prekey: key.publicKey })))
    .select("*");
  if (error) throw error;
  return data ?? [];
}

function createClientUuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
