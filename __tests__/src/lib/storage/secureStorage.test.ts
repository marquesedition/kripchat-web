import { clearSecureStorage, getDeviceId, getPrivateKey, saveDeviceId, savePrivateKey } from "@/src/lib/storage/secureStorage";

jest.mock("expo-secure-store", () => {
  const values = new Map<string, string>();
  return {
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    })
  };
});

describe("secureStorage", () => {
  it("stores private keys and device id in local device storage helpers", async () => {
    await savePrivateKey("device-1", "private-key");
    await saveDeviceId("device-1");

    await expect(getPrivateKey("device-1")).resolves.toBe("private-key");
    await expect(getDeviceId()).resolves.toBe("device-1");

    await clearSecureStorage("device-1");
    await expect(getPrivateKey("device-1")).resolves.toBeNull();
    await expect(getDeviceId()).resolves.toBeNull();
  });
});
