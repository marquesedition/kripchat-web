import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function useTypingChannel(conversationId: string, userId?: string | null) {
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId || conversationId === "pending") return undefined;

    const channel = supabase.channel(`typing:${conversationId}:${userId ?? "anonymous"}`, {
      config: { broadcast: { self: false } }
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.userId || payload.userId === userId) return;
        setTypingUserIds((current) => Array.from(new Set([...current, payload.userId])));
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setTypingUserIds([]), 2200);
      })
      .subscribe();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setTypingUserIds([]);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const broadcastTyping = useCallback(() => {
    if (!userId) return;
    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { conversationId, userId, at: Date.now() }
    });
  }, [conversationId, userId]);

  return { typingUserIds, broadcastTyping };
}
