import AsyncStorage from "@react-native-async-storage/async-storage";
import { assertCryptoProviderAvailableForStack, getKripChatCryptoStack } from "./config";
import type { KripChatCryptoStack } from "./types";

const CRYPTO_STACK_PREFERENCE_KEY = "kripchat.shield.crypto-stack-preference.v1";

function isValidCryptoStack(value: string | null): value is KripChatCryptoStack {
  return value === "legacy-device-envelope-v1" || value === "kripchat-shield-v1";
}

export async function getPreferredCryptoStack(): Promise<KripChatCryptoStack> {
  const stored = await AsyncStorage.getItem(CRYPTO_STACK_PREFERENCE_KEY);
  if (isValidCryptoStack(stored)) return stored;
  return getKripChatCryptoStack();
}

export async function setPreferredCryptoStack(stack: KripChatCryptoStack) {
  await AsyncStorage.setItem(CRYPTO_STACK_PREFERENCE_KEY, stack);
}

export async function assertPreferredCryptoProviderAvailable() {
  const stack = await getPreferredCryptoStack();
  assertCryptoProviderAvailableForStack(stack);
}
