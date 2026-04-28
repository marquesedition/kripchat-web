import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const TYPING_TTL_MS = 2200;

export function useTypingChannel(conversationId: string, userId?: string | null) {
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    if (!conversationId || conversationId === "pending") return undefined;

    // Every participant must join the exact same channel per conversation.
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } }
    });
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (!payload?.userId || payload.userId === userId) return;
        setTypingUserIds((current) => Array.from(new Set([...current, payload.userId])));
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setTypingUserIds([]), TYPING_TTL_MS);
      })
      .subscribe((status) => {
        setReady(status === "SUBSCRIBED");
      });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setReady(false);
      setTypingUserIds([]);
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const broadcastTyping = useCallback(() => {
    if (!userId || !ready) return;
    const now = Date.now();
    if (now - lastSentAtRef.current < 650) return;
    lastSentAtRef.current = now;

    channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { conversationId, userId, at: Date.now() }
    });
  }, [conversationId, ready, userId]);

  return { typingUserIds, broadcastTyping, typingReady: ready };
}
