import { useEffect } from "react";
import { AppState } from "react-native";
import { clearPresence, updatePresence } from "@/features/chat/chatService";

export function usePresence(userId?: string | null, enabled = true) {
  useEffect(() => {
    if (!userId || !enabled) return;

    const ping = () => updatePresence(userId).catch(() => undefined);
    const goOffline = () => clearPresence(userId).catch(() => undefined);
    ping();
    const interval = setInterval(ping, 45_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        ping();
        return;
      }
      goOffline();
    });

    return () => {
      goOffline();
      clearInterval(interval);
      subscription.remove();
    };
  }, [enabled, userId]);
}
