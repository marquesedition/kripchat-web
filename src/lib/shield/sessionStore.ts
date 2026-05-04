import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ShieldSessionState } from "./types";

const SHIELD_SESSION_PREFIX = "kripchat.shield.session.v1";

export function getShieldSessionStorageKey(input: { conversationId: string; localDeviceId: string; remoteDeviceId: string }) {
  return `${SHIELD_SESSION_PREFIX}:${input.conversationId}:${input.localDeviceId}:${input.remoteDeviceId}`;
}

export async function saveShieldSessionState(session: ShieldSessionState) {
  await AsyncStorage.setItem(
    getShieldSessionStorageKey(session),
    JSON.stringify({
      ...session,
      updatedAt: new Date().toISOString()
    })
  );
}

export async function getShieldSessionState(input: {
  conversationId: string;
  localDeviceId: string;
  remoteDeviceId: string;
}): Promise<ShieldSessionState | null> {
  const raw = await AsyncStorage.getItem(getShieldSessionStorageKey(input));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ShieldSessionState;
    if (parsed.version === 1 && parsed.sessionId && parsed.localDeviceId && parsed.remoteDeviceId) return parsed;
  } catch {
    return null;
  }

  return null;
}

export async function deleteShieldSessionState(input: { conversationId: string; localDeviceId: string; remoteDeviceId: string }) {
  await AsyncStorage.removeItem(getShieldSessionStorageKey(input));
}
