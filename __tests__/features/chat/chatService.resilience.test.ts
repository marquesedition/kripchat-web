jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import { fetchMessages } from "@/features/chat/chatService";
import { supabase } from "@/lib/supabase";
import * as e2ee from "@/lib/e2ee";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn()
  }
}));

describe("chat service resilience", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does not crash on reload when shared key derivation fails", async () => {
    jest.spyOn(e2ee, "deriveConversationSharedKey").mockRejectedValue(new Error("invalid key material"));

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "messages") {
        const query = {
          select: jest.fn(),
          eq: jest.fn(),
          order: jest.fn(),
          limit: jest.fn()
        };
        query.select.mockReturnValue(query);
        query.eq.mockReturnValue(query);
        query.order.mockReturnValue(query);
        query.limit.mockResolvedValue({
          data: [
            {
              id: "m-1",
              conversation_id: "c-1",
              sender_id: "peer-1",
              body: "krypchat:v2:not-real.encrypted",
              client_id: "m-1",
              status: "sent",
              kind: "text",
              attachment_path: null,
              attachment_name: null,
              attachment_mime: null,
              attachment_size: null,
              location_lat: null,
              location_lng: null,
              location_label: null,
              created_at: "2026-04-27T19:00:00.000Z"
            }
          ],
          error: null
        });
        return query;
      }

      if (table === "conversation_participants") {
        const query = {
          select: jest.fn(),
          eq: jest.fn()
        };
        query.select.mockReturnValue(query);
        query.eq.mockResolvedValue({
          data: [
            {
              conversation_id: "c-1",
              profile_id: "peer-1",
              profile: {
                id: "peer-1",
                username: "peer",
                avatar_url: null,
                push_token: null,
                e2ee_public_key: "broken-peer-key",
                online_at: null,
                created_at: "2026-04-27T18:50:00.000Z"
              }
            }
          ],
          error: null
        });
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const messages = await fetchMessages("c-1", "user-1");

    expect(messages).toHaveLength(1);
    expect(messages[0].body).toBe("[encrypted packet]");
  });

  it("still returns plaintext messages unchanged", async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === "messages") {
        const query = {
          select: jest.fn(),
          eq: jest.fn(),
          order: jest.fn(),
          limit: jest.fn()
        };
        query.select.mockReturnValue(query);
        query.eq.mockReturnValue(query);
        query.order.mockReturnValue(query);
        query.limit.mockResolvedValue({
          data: [
            {
              id: "m-2",
              conversation_id: "c-1",
              sender_id: "peer-1",
              body: "plain message",
              client_id: "m-2",
              status: "sent",
              kind: "text",
              attachment_path: null,
              attachment_name: null,
              attachment_mime: null,
              attachment_size: null,
              location_lat: null,
              location_lng: null,
              location_label: null,
              created_at: "2026-04-27T19:01:00.000Z"
            }
          ],
          error: null
        });
        return query;
      }

      if (table === "conversation_participants") {
        const query = {
          select: jest.fn(),
          eq: jest.fn()
        };
        query.select.mockReturnValue(query);
        query.eq.mockResolvedValue({
          data: [
            {
              conversation_id: "c-1",
              profile_id: "peer-1",
              profile: {
                id: "peer-1",
                username: "peer",
                avatar_url: null,
                push_token: null,
                e2ee_public_key: null,
                online_at: null,
                created_at: "2026-04-27T18:50:00.000Z"
              }
            }
          ],
          error: null
        });
        return query;
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const messages = await fetchMessages("c-1", "user-1");
    expect(messages[0].body).toBe("plain message");
  });
});
