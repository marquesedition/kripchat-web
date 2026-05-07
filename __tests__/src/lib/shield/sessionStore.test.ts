import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteShieldSessionState, getShieldSessionState, saveShieldSessionState, type ShieldSessionState } from "@/src/lib/shield";

const session: ShieldSessionState = {
  version: 1,
  conversationId: "conversation-1",
  localUserId: "user-a",
  localDeviceId: "device-a",
  remoteUserId: "user-b",
  remoteDeviceId: "device-b",
  sessionId: "shield:v1:conversation-1:device-a:device-b",
  ratchetEpoch: 4,
  createdAt: "2026-05-04T09:00:00.000Z",
  updatedAt: "2026-05-04T09:00:00.000Z",
  remoteIdentityFingerprint: "fingerprint-b",
  providerId: "test-shield-provider"
};

describe("Shield session store", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("persists and reads session state by conversation and device pair", async () => {
    await saveShieldSessionState(session);

    await expect(
      getShieldSessionState({
        conversationId: "conversation-1",
        localDeviceId: "device-a",
        remoteDeviceId: "device-b"
      })
    ).resolves.toMatchObject({
      sessionId: session.sessionId,
      ratchetEpoch: 4,
      remoteIdentityFingerprint: "fingerprint-b"
    });
  });

  it("deletes session state", async () => {
    await saveShieldSessionState(session);
    await deleteShieldSessionState(session);

    await expect(
      getShieldSessionState({
        conversationId: "conversation-1",
        localDeviceId: "device-a",
        remoteDeviceId: "device-b"
      })
    ).resolves.toBeNull();
  });
});
