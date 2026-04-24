import { useEffect } from "react";
import { AppState } from "react-native";
import { updatePresence } from "@/features/chat/chatService";

export function usePresence(userId?: string | null) {
  useEffect(() => {
    if (!userId) return;

    const ping = () => updatePresence(userId).catch(() => undefined);
    ping();
    const interval = setInterval(ping, 45_000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") ping();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [userId]);
}
