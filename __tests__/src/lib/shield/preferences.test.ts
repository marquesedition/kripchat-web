import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  assertPreferredCryptoProviderAvailable,
  getPreferredCryptoStack,
  setKripChatRuntimeOverrideForTests,
  setPreferredCryptoStack
} from "@/src/lib/shield";

describe("KripChat Shield preferences", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    setKripChatRuntimeOverrideForTests(null);
  });

  afterAll(() => {
    setKripChatRuntimeOverrideForTests(null);
  });

  it("defaults to the configured crypto stack", async () => {
    await expect(getPreferredCryptoStack()).resolves.toBe("legacy-device-envelope-v1");
  });

  it("persists the selected crypto stack locally", async () => {
    await setPreferredCryptoStack("kripchat-shield-v1");
    await expect(getPreferredCryptoStack()).resolves.toBe("kripchat-shield-v1");
  });

  it("fails closed when the selected Shield stack has no provider", async () => {
    await setPreferredCryptoStack("kripchat-shield-v1");
    await expect(assertPreferredCryptoProviderAvailable()).rejects.toThrow("no production Shield provider");
  });
});
