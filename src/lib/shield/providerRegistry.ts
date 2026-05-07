import type { ShieldCryptoProvider } from "./ShieldCryptoProvider";

const unavailableProvider: ShieldCryptoProvider = {
  providerId: "shield-provider-unavailable",
  productionReady: false,
  async generateDeviceBundle() {
    throw buildUnavailableError();
  },
  async establishSession() {
    throw buildUnavailableError();
  },
  async encryptMessage() {
    throw buildUnavailableError();
  },
  async decryptMessage() {
    throw buildUnavailableError();
  },
  async rotateDeviceKeys() {
    throw buildUnavailableError();
  }
};

let activeProvider: ShieldCryptoProvider = unavailableProvider;

export function registerShieldCryptoProvider(provider: ShieldCryptoProvider) {
  activeProvider = provider;
}

export function resetShieldCryptoProviderForTests() {
  if (process.env.NODE_ENV !== "test") {
    throw new Error("Shield provider reset is only allowed in tests.");
  }
  activeProvider = unavailableProvider;
}

export function getShieldCryptoProvider() {
  return activeProvider;
}

export function isShieldCryptoProviderAvailable() {
  return activeProvider.productionReady;
}

export function assertShieldCryptoProviderRegistered() {
  if (isShieldCryptoProviderAvailable()) return;
  throw buildUnavailableError();
}

function buildUnavailableError() {
  return new Error(
    "KripChat Shield crypto is selected, but no production Shield provider is registered yet. Switch back to Classic encryption or wait until the Shield provider lands."
  );
}
