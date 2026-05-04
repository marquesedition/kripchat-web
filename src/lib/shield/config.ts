import type { KripChatAppMode, KripChatCryptoStack } from "./types";

const DEFAULT_APP_MODE: KripChatAppMode = "classic";
const DEFAULT_CRYPTO_STACK: KripChatCryptoStack = "legacy-device-envelope-v1";

let testRuntimeOverride: Partial<{
  appMode: KripChatAppMode;
  cryptoStack: KripChatCryptoStack;
}> | null = null;

export function setKripChatRuntimeOverrideForTests(
  override: Partial<{ appMode: KripChatAppMode; cryptoStack: KripChatCryptoStack }> | null
) {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("KripChat runtime overrides are only allowed in tests.");
  }
  testRuntimeOverride = override;
}

export function getKripChatAppMode(): KripChatAppMode {
  if (testRuntimeOverride?.appMode) return testRuntimeOverride.appMode;
  const value = process.env["EXPO_PUBLIC_KRIPCHAT_APP_MODE"]?.trim().toLowerCase();
  return value === "shield" ? "shield" : DEFAULT_APP_MODE;
}

export function getKripChatCryptoStack(): KripChatCryptoStack {
  if (testRuntimeOverride?.cryptoStack) return testRuntimeOverride.cryptoStack;
  const value = process.env["EXPO_PUBLIC_KRIPCHAT_CRYPTO_STACK"]?.trim().toLowerCase();
  return value === "kripchat-shield-v1" ? "kripchat-shield-v1" : DEFAULT_CRYPTO_STACK;
}

export function isShieldAppModeEnabled() {
  return getKripChatAppMode() === "shield";
}

export function isShieldCryptoRequested() {
  return getKripChatCryptoStack() === "kripchat-shield-v1";
}

export function assertShieldCryptoProviderAvailable() {
  if (!isShieldCryptoRequested()) return;

  throw new Error(
    "KripChat Shield crypto is requested, but no production Shield provider is registered yet. Keep EXPO_PUBLIC_KRIPCHAT_CRYPTO_STACK=legacy-device-envelope-v1 until the Shield provider lands."
  );
}
