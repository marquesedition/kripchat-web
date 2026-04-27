import { useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeIn, FadeOut } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { createDecryptedAttachmentUrl } from "@/features/chat/chatService";
import { colors, fonts, radii } from "@/lib/theme";
import { createCipherPreview, revealCipherText } from "@/lib/cryptoVisual";
import { formatOpsCode } from "@/lib/opsIdentity";
import type { Message } from "@/features/chat/types";

type CryptoPhase = "decrypting" | "visible" | "secured" | "encrypted";

const PROCESSED_STORAGE_KEY = "krypchat.processed-message-keys.v1";
const AUTO_REVEAL_MAX_AGE_MS = 15_000;
const processedMessageKeys = new Set<string>();
loadProcessedMessageKeys();

type Props = {
  message: Message;
  mine: boolean;
  currentUserId?: string | null;
  revealDurationMs?: number;
  onLongPress?: (message: Message, cipherText: string) => void;
};

export function MessageBubble({ message, mine, currentUserId, revealDurationMs, onLongPress }: Props) {
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const messageKey = message.client_id ?? message.id;
  const senderCode = formatOpsCode(message.sender_id);
  const cipherText = useMemo(() => createCipherPreview(message.body, messageKey), [message.body, messageKey]);
  const visibilityMs = useMemo(() => revealDurationMs ?? estimateHumanReadTimeMs(message.body), [message.body, revealDurationMs]);
  const shouldAutoReveal = useMemo(() => shouldRevealMessage(message.created_at), [message.created_at]);
  const [displayBody, setDisplayBody] = useState(cipherText);
  const [phase, setPhase] = useState<CryptoPhase>(
    mine ? "encrypted" : processedMessageKeys.has(messageKey) || !shouldAutoReveal ? "secured" : "decrypting"
  );
  const [decryptProgress, setDecryptProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.ceil(visibilityMs / 1000));
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const canInspectPayload = phase === "visible";

  useEffect(() => {
    if (mine) {
      setDisplayBody(cipherText);
      setPhase("encrypted");
      setDecryptProgress(100);
      setRemainingSeconds(0);
      return;
    }

    if (processedMessageKeys.has(messageKey) || !shouldAutoReveal) {
      markMessageProcessed(messageKey);
      setDisplayBody(cipherText);
      setPhase("secured");
      setDecryptProgress(0);
      setRemainingSeconds(0);
      return;
    }

    markMessageProcessed(messageKey);
    setPhase("decrypting");
    setDecryptProgress(0);
    setDisplayBody(cipherText);
    setRemainingSeconds(Math.ceil(visibilityMs / 1000));

    const timers: ReturnType<typeof setTimeout>[] = [];
    const steps = 24;
    const startDelay = 420;
    const stepDuration = 82;
    const visibleAt = startDelay + (steps + 1) * stepDuration;
    const totalVisibleSeconds = Math.ceil(visibilityMs / 1000);

    for (let step = 0; step <= steps; step += 1) {
      timers.push(
        setTimeout(() => {
          const progress = step / steps;
          setDecryptProgress(Math.round(progress * 100));
          setDisplayBody(revealCipherText(message.body, cipherText, progress));
        }, startDelay + step * stepDuration)
      );
    }

    timers.push(
      setTimeout(() => {
        setDisplayBody(message.body);
        setPhase("visible");
        setDecryptProgress(100);
        setRemainingSeconds(totalVisibleSeconds);
      }, visibleAt)
    );

    for (let second = 1; second <= totalVisibleSeconds; second += 1) {
      timers.push(
        setTimeout(() => {
          setRemainingSeconds(Math.max(totalVisibleSeconds - second, 0));
        }, visibleAt + second * 1000)
      );
    }

    timers.push(
      setTimeout(() => {
        setDisplayBody(cipherText);
        setPhase("secured");
        setDecryptProgress(0);
      }, visibleAt + visibilityMs)
    );

    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [cipherText, message.body, messageKey, mine, shouldAutoReveal, visibilityMs]);

  useEffect(() => {
    let active = true;
    if (!message.attachment_path || !currentUserId) {
      setAttachmentUrl(null);
      return undefined;
    }

    createDecryptedAttachmentUrl(
      message.attachment_path,
      message.conversation_id,
      currentUserId,
      message.attachment_mime ?? "application/octet-stream"
    )
      .then((url) => {
        if (active) setAttachmentUrl(url);
      })
      .catch(() => {
        if (active) setAttachmentUrl(null);
      });

    return () => {
      active = false;
    };
  }, [currentUserId, message.attachment_mime, message.attachment_path, message.conversation_id]);

  return (
    <Pressable delayLongPress={260} onLongPress={() => onLongPress?.(message, cipherText)} style={styles.pressable}>
      <Animated.View entering={FadeInDown.duration(180)} style={[styles.row, mine && styles.rowMine]}>
        <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
          <Text style={[styles.body, mine ? styles.mineBody : styles.theirBody, (mine || phase !== "visible") && (mine ? styles.mineCipherBody : styles.cipherBody)]}>
            {displayBody}
          </Text>
          {canInspectPayload ? <AttachmentPayload message={message} attachmentUrl={attachmentUrl} mine={mine} /> : null}
          {!mine && phase === "decrypting" ? (
            <View style={styles.decryptRail}>
              <View style={[styles.decryptFill, { width: `${decryptProgress}%` }]} />
            </View>
          ) : null}
        </View>
        <View style={[styles.metaDeck, mine && styles.metaDeckMine]}>
          <Text style={styles.senderCode}>{mine ? "YOU" : senderCode}</Text>
          <Animated.View key={phase} entering={FadeIn.duration(120)} exiting={FadeOut.duration(80)} style={styles.decryptPill}>
            <Text style={styles.decryptText}>{formatCryptoState(phase, remainingSeconds, decryptProgress)}</Text>
          </Animated.View>
          <Text style={styles.time}>{time}</Text>
          {mine ? <Text style={[styles.status, message.status === "failed" && styles.failed]}>{formatStatus(message.status)}</Text> : null}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function markMessageProcessed(messageKey: string) {
  processedMessageKeys.add(messageKey);
  persistProcessedMessageKeys();
}

function loadProcessedMessageKeys() {
  try {
    if (typeof localStorage === "undefined") return;
    const raw = localStorage.getItem(PROCESSED_STORAGE_KEY);
    if (!raw) return;
    const keys = JSON.parse(raw) as string[];
    for (const key of keys) processedMessageKeys.add(key);
  } catch {
    // Keep visual encryption working even when storage is unavailable.
  }
}

function persistProcessedMessageKeys() {
  try {
    if (typeof localStorage === "undefined") return;
    const latestKeys = Array.from(processedMessageKeys).slice(-500);
    localStorage.setItem(PROCESSED_STORAGE_KEY, JSON.stringify(latestKeys));
  } catch {
    // Storage can fail in private modes; the in-memory set still protects this session.
  }
}

function AttachmentPayload({ attachmentUrl, message, mine }: { attachmentUrl: string | null; message: Message; mine: boolean }) {
  if (message.kind === "text") return null;

  if (message.kind === "image" && attachmentUrl) {
    return <Image source={{ uri: attachmentUrl }} style={styles.imagePreview} />;
  }

  if (message.kind === "location") {
    if (message.location_lat == null || message.location_lng == null) {
      return (
        <Pressable style={styles.payloadCard}>
          <Ionicons name="location" color={mine ? colors.cream : "#405047"} size={18} />
          <View style={styles.payloadText}>
            <Text style={[styles.payloadTitle, mine ? styles.mineBody : styles.theirBody]} numberOfLines={1}>{message.location_label ?? "Desired location"}</Text>
            <Text style={[styles.payloadMeta, mine ? styles.mineCipherBody : styles.cipherBody]} numberOfLines={1}>Desired location</Text>
          </View>
        </Pressable>
      );
    }

    const link = `https://maps.google.com/?q=${message.location_lat},${message.location_lng}`;
    return (
      <Pressable style={styles.payloadCard} onPress={() => Linking.openURL(link)}>
        <Ionicons name="location" color={mine ? colors.cream : "#405047"} size={18} />
        <View style={styles.payloadText}>
          <Text style={[styles.payloadTitle, mine ? styles.mineBody : styles.theirBody]} numberOfLines={1}>{message.location_label ?? "Secure location"}</Text>
          <Text style={[styles.payloadMeta, mine ? styles.mineCipherBody : styles.cipherBody]} numberOfLines={1}>
            {message.location_lat.toFixed(5)}, {message.location_lng.toFixed(5)}
          </Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.payloadCard} disabled={!attachmentUrl} onPress={() => attachmentUrl && Linking.openURL(attachmentUrl)}>
      <Ionicons name={iconForKind(message.kind)} color={mine ? colors.cream : "#405047"} size={18} />
      <View style={styles.payloadText}>
        <Text style={[styles.payloadTitle, mine ? styles.mineBody : styles.theirBody]} numberOfLines={1}>{message.attachment_name ?? labelForKind(message.kind)}</Text>
        <Text style={[styles.payloadMeta, mine ? styles.mineCipherBody : styles.cipherBody]} numberOfLines={1}>
          {labelForKind(message.kind)} {formatBytes(message.attachment_size)}
        </Text>
      </View>
    </Pressable>
  );
}

function formatStatus(status: Message["status"]) {
  if (status === "sending") return "sending";
  if (status === "failed") return "failed";
  if (status === "delivered") return "delivered";
  return "sent";
}

function formatCryptoState(phase: CryptoPhase, remainingSeconds: number, decryptProgress: number) {
  if (phase === "encrypted") return "Encrypted";
  if (phase === "decrypting") return `Decrypting ${decryptProgress}%`;
  if (phase === "visible") return `Visible ${remainingSeconds}`;
  return "Re-encrypted";
}

function estimateHumanReadTimeMs(body: string) {
  const chars = body.trim().length;
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  const secondsByWords = words / (200 / 60);
  const secondsByChars = chars / 16;
  const estimatedSeconds = Math.ceil(Math.max(secondsByWords, secondsByChars) + 1.5);
  const clampedSeconds = Math.min(90, Math.max(5, estimatedSeconds));
  return clampedSeconds * 1000;
}

function shouldRevealMessage(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return false;
  const age = Date.now() - timestamp;
  return age >= 0 && age <= AUTO_REVEAL_MAX_AGE_MS;
}

function iconForKind(kind: Message["kind"]): keyof typeof Ionicons.glyphMap {
  if (kind === "video") return "videocam";
  if (kind === "audio") return "mic";
  if (kind === "document") return "document-text";
  if (kind === "location") return "location";
  return "image";
}

function labelForKind(kind: Message["kind"]) {
  if (kind === "video") return "Secure video";
  if (kind === "audio") return "Secure audio";
  if (kind === "document") return "Secure document";
  if (kind === "location") return "Secure location";
  return "Secure image";
}

function formatBytes(value: number | null) {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

const styles = StyleSheet.create({
  pressable: {
    width: "100%"
  },
  row: {
    width: "100%",
    alignItems: "flex-start",
    paddingHorizontal: 18,
    marginVertical: 6
  },
  rowMine: {
    alignItems: "flex-end"
  },
  bubble: {
    maxWidth: "76%",
    borderRadius: radii.md,
    paddingHorizontal: 18,
    paddingVertical: 15,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 150
  },
  mine: {
    backgroundColor: "rgba(47, 123, 139, 0.78)",
    borderColor: "rgba(142, 205, 201, 0.30)",
    borderTopRightRadius: 2
  },
  theirs: {
    backgroundColor: "rgba(216, 227, 192, 0.90)",
    borderColor: "rgba(240, 247, 216, 0.48)",
    borderTopLeftRadius: 2
  },
  body: {
    fontFamily: fonts.mono,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 23
  },
  decryptRail: {
    height: 3,
    marginTop: 12,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(53, 70, 64, 0.22)"
  },
  decryptFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: colors.green
  },
  imagePreview: {
    width: 230,
    maxWidth: "100%",
    height: 160,
    borderRadius: radii.md,
    marginTop: 12,
    backgroundColor: "rgba(2, 6, 7, 0.26)"
  },
  payloadCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 210,
    marginTop: 12,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(53, 70, 64, 0.18)",
    backgroundColor: "rgba(2, 6, 7, 0.10)",
    paddingHorizontal: 11,
    paddingVertical: 10
  },
  payloadText: {
    flex: 1,
    minWidth: 0
  },
  payloadTitle: {
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: "900"
  },
  payloadMeta: {
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 3
  },
  mineBody: {
    color: colors.cream
  },
  theirBody: {
    color: "#405047"
  },
  cipherBody: {
    color: "#354640"
  },
  mineCipherBody: {
    color: "#bed4c5"
  },
  metaDeck: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "76%",
    marginTop: 5
  },
  metaDeckMine: {
    justifyContent: "flex-end"
  },
  senderCode: {
    minWidth: 62,
    borderRadius: radii.pill,
    backgroundColor: "rgba(216, 227, 192, 0.30)",
    color: colors.cream,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 11,
    paddingVertical: 4,
    textAlign: "center"
  },
  decryptPill: {
    borderRadius: radii.pill,
    backgroundColor: colors.cream,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  decryptText: {
    color: "#405047",
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900"
  },
  time: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 10
  },
  status: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 10
  },
  failed: {
    color: colors.danger
  }
});
