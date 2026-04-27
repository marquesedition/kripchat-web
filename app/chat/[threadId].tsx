import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { MessageBubble } from "@/components/MessageBubble";
import { ScreenShell } from "@/components/ScreenShell";
import { uploadChatAttachment } from "@/features/chat/chatService";
import { useAuthStore } from "@/features/auth/authStore";
import { useChatStore } from "@/features/chat/chatStore";
import type { Message, MessageKind } from "@/features/chat/types";
import { useTypingChannel } from "@/hooks/useTypingChannel";
import { formatOpsCode, formatShortId } from "@/lib/opsIdentity";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { getUserFacingErrorMessage } from "@/lib/userFeedback";
import { sanitizeMessage } from "@/lib/validation";

const EMPTY_MESSAGES: Message[] = [];
const VISIBILITY_OPTIONS = [5, 10, 30, 60];

type ViewWindowMode = "auto" | "manual";

type SelectedPacket = {
  message: Message;
  cipherText: string;
} | null;

export default function ChatScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const conversationId = Array.isArray(threadId) ? threadId[0] : threadId;
  const userId = useAuthStore((state) => state.session?.user.id);
  const previews = useChatStore((state) => state.previews);
  const messages = useChatStore((state) => (conversationId ? state.messagesByConversation[conversationId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES));
  const loadMessages = useChatStore((state) => state.loadMessages);
  const loadOlderMessages = useChatStore((state) => state.loadOlderMessages);
  const send = useChatStore((state) => state.send);
  const subscribeToConversation = useChatStore((state) => state.subscribeToConversation);
  const unsubscribeActive = useChatStore((state) => state.unsubscribeActive);
  const [draft, setDraft] = useState("");
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => new Set());
  const [selectedPacket, setSelectedPacket] = useState<SelectedPacket>(null);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [desiredLocationOpen, setDesiredLocationOpen] = useState(false);
  const [desiredLocation, setDesiredLocation] = useState("");
  const [viewWindowMode, setViewWindowMode] = useState<ViewWindowMode>("auto");
  const [visibilitySeconds, setVisibilitySeconds] = useState(10);
  const listRef = useRef<FlatList>(null);
  const { typingUserIds, broadcastTyping } = useTypingChannel(conversationId ?? "pending", userId);

  const peer = useMemo(() => previews.find((item) => item.conversation.id === conversationId)?.peer, [conversationId, previews]);
  const peerCode = formatOpsCode(peer?.username);
  const threadCode = formatShortId(conversationId ?? "0000");
  const visibleMessages = useMemo(() => messages.filter((message) => !hiddenIds.has(message.client_id ?? message.id)), [hiddenIds, messages]);
  const presenceStatus = peer?.online_at ? "PRESENCE SYNCED" : "PRESENCE STANDBY";

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace("/(tabs)");
  }

  useEffect(() => {
    if (!conversationId || !userId) return undefined;
    loadMessages(conversationId, userId).catch((error) =>
      Alert.alert("Load failed", getUserFacingErrorMessage(error, "No se pudo cargar este canal."))
    );
    subscribeToConversation(conversationId, userId);
    return unsubscribeActive;
  }, [conversationId, loadMessages, subscribeToConversation, unsubscribeActive, userId]);

  useEffect(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [visibleMessages.length]);

  if (!userId) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!conversationId) {
    return <Redirect href="/(tabs)" />;
  }

  async function onSend() {
    if (!userId) return;
    const clean = sanitizeMessage(draft);
    if (!clean) return;
    setDraft("");
    try {
      if (!conversationId) return;
      await send(conversationId, userId, clean);
    } catch (error) {
      Alert.alert("Send failed", getUserFacingErrorMessage(error, "El mensaje no se pudo entregar."));
    }
  }

  function handleComposerKeyPress(event: { nativeEvent: { key?: string; shiftKey?: boolean } }) {
    if (Platform.OS !== "web") return;
    if (event.nativeEvent.key === "Enter" && !event.nativeEvent.shiftKey) {
      onSend().catch(() => undefined);
    }
  }

  async function pasteFromClipboard() {
    const value = await Clipboard.getStringAsync();
    if (!value.trim()) return;
    setDraft((current) => (current ? `${current}${value}` : value));
  }

  async function pickMedia(kind: Extract<MessageKind, "image" | "video">) {
    if (!conversationId || !userId) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: kind === "image" ? "images" : "videos",
      quality: 0.85
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await sendAttachment({
      uri: asset.uri,
      name: asset.fileName ?? `${kind}-${Date.now()}`,
      mimeType: asset.mimeType ?? (kind === "image" ? "image/jpeg" : "video/mp4"),
      kind
    });
  }

  async function pickDocument(kind: Extract<MessageKind, "audio" | "document">) {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: kind === "audio" ? ["audio/*"] : ["application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "*/*"]
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await sendAttachment({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? "application/octet-stream",
      kind
    });
  }

  async function sendAttachment(input: { uri: string; name: string; mimeType: string; kind: MessageKind }) {
    if (!conversationId || !userId) return;
    setToolsOpen(false);
    try {
      const uploaded = await uploadChatAttachment({
        conversationId,
        senderId: userId,
        uri: input.uri,
        name: input.name,
        mimeType: input.mimeType
      });
      await send(conversationId, userId, {
        body: `[${input.kind}] ${uploaded.name}`,
        kind: input.kind,
        attachmentPath: uploaded.path,
        attachmentName: uploaded.name,
        attachmentMime: uploaded.mimeType,
        attachmentSize: uploaded.size
      });
    } catch (error) {
      Alert.alert("Attachment failed", getUserFacingErrorMessage(error, "No se pudo enviar este archivo."));
    }
  }

  async function sendCurrentLocation() {
    if (!conversationId || !userId) return;
    try {
      setToolsOpen(false);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location blocked", "Enable location permission to send your current position.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await send(conversationId, userId, {
        body: "[location] current position",
        kind: "location",
        locationLat: position.coords.latitude,
        locationLng: position.coords.longitude,
        locationLabel: "Current position"
      });
    } catch (error) {
      Alert.alert("Location failed", getUserFacingErrorMessage(error, "No se pudo enviar la ubicación actual."));
    }
  }

  async function sendDesiredLocation() {
    if (!conversationId || !userId) return;
    const clean = desiredLocation.trim();
    if (!clean) return;
    try {
      setDesiredLocation("");
      setDesiredLocationOpen(false);
      setToolsOpen(false);
      await send(conversationId, userId, {
        body: `[location] ${clean}`,
        kind: "location",
        locationLat: null,
        locationLng: null,
        locationLabel: clean
      });
    } catch (error) {
      Alert.alert("Location failed", getUserFacingErrorMessage(error, "No se pudo enviar la ubicación deseada."));
    }
  }

  async function copyText(value: string, label: string) {
    await Clipboard.setStringAsync(value);
    setSelectedPacket(null);
    setSecurityOpen(false);
    Alert.alert("Copied", `${label} copied to clipboard.`);
  }

  function hideSelectedPacket() {
    if (!selectedPacket) return;
    const key = selectedPacket.message.client_id ?? selectedPacket.message.id;
    setHiddenIds((current) => {
      const next = new Set(current);
      next.add(key);
      return next;
    });
    setSelectedPacket(null);
  }

  function showPacketIntel() {
    if (!selectedPacket) return;
    const { message } = selectedPacket;
    setSelectedPacket(null);
    Alert.alert(
      "Packet intel",
      [
        `Status: ${message.status}`,
        `Sent: ${new Date(message.created_at).toLocaleString()}`,
        `Sender: ${formatShortId(message.sender_id)}`,
        `Packet: ${formatShortId(message.client_id ?? message.id)}`,
        `Thread: ${formatShortId(message.conversation_id)}`
      ].join("\n")
    );
  }

  async function reloadThread() {
    if (!conversationId || !userId) return;
    setSecurityOpen(false);
    try {
      await loadMessages(conversationId, userId);
      Alert.alert("Channel synced", "Latest encrypted packets loaded.");
    } catch (error) {
      Alert.alert("Sync failed", getUserFacingErrorMessage(error, "No se pudo recargar este canal."));
    }
  }

  return (
    <ScreenShell>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8} style={styles.root}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={goBack} style={styles.backButton}>
            <Ionicons name="chevron-back" color={colors.bg} size={25} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>{peerCode}</Text>
            <Text style={styles.status}>{typingUserIds.length ? "INCOMING KEYSTROKES" : "SECURE CHANNEL ACTIVE"}</Text>
          </View>
          <Pressable accessibilityLabel="Chat information" accessibilityRole="button" onPress={() => setSecurityOpen(true)} style={styles.headerIconButton}>
            <Ionicons name="shield-checkmark" color={colors.green} size={19} />
          </Pressable>
        </View>

        <FlatList
          ref={listRef}
          data={visibleMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              mine={item.sender_id === userId}
              currentUserId={userId ?? null}
              revealDurationMs={viewWindowMode === "manual" ? visibilitySeconds * 1000 : undefined}
              onLongPress={(message, cipherText) => setSelectedPacket({ message, cipherText })}
            />
          )}
          contentContainerStyle={styles.messages}
          onStartReached={() => {
            if (conversationId && userId) {
              loadOlderMessages(conversationId, userId).catch((error) =>
                Alert.alert("Load failed", getUserFacingErrorMessage(error, "No se pudieron cargar mensajes anteriores."))
              );
            }
          }}
          onStartReachedThreshold={0.25}
          ListEmptyComponent={<Text style={styles.empty}>No packets received. Establish secure contact.</Text>}
        />

        <View style={styles.composer}>
          <Pressable accessibilityLabel="Open attachments" accessibilityRole="button" onPress={() => setToolsOpen(true)} style={styles.utilityButton}>
            <Ionicons name="add" color={colors.green} size={22} />
          </Pressable>
          <Pressable accessibilityLabel="Paste clipboard" accessibilityRole="button" onPress={pasteFromClipboard} style={styles.utilityButton}>
            <Ionicons name="clipboard-outline" color={colors.green} size={19} />
          </Pressable>
          <TextInput
            multiline
            blurOnSubmit={false}
            placeholder="Type encrypted packet..."
            placeholderTextColor={colors.faint}
            returnKeyType="send"
            value={draft}
            onChangeText={(value) => {
              setDraft(value);
              broadcastTyping();
            }}
            onKeyPress={handleComposerKeyPress}
            onSubmitEditing={onSend}
            style={styles.input}
          />
          <Pressable accessibilityRole="button" onPress={onSend} style={[styles.sendButton, !sanitizeMessage(draft) && styles.sendDisabled]}>
            <Ionicons name="send" color={colors.bg} size={21} />
          </Pressable>
        </View>

        <Modal visible={selectedPacket !== null} transparent animationType="fade" onRequestClose={() => setSelectedPacket(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedPacket(null)}>
            <Pressable style={styles.actionSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>PACKET ACTIONS</Text>
              <ActionRow icon="copy-outline" label="Copy decrypted text" onPress={() => selectedPacket && copyText(selectedPacket.message.body, "Decrypted text")} />
              <ActionRow icon="barcode-outline" label="Copy encrypted packet" onPress={() => selectedPacket && copyText(selectedPacket.cipherText, "Encrypted packet")} />
              <ActionRow icon="analytics-outline" label="View packet intel" onPress={showPacketIntel} />
              <ActionRow icon="eye-off-outline" label="Hide on this device" danger onPress={hideSelectedPacket} />
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={toolsOpen} transparent animationType="fade" onRequestClose={() => setToolsOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setToolsOpen(false)}>
            <Pressable style={styles.actionSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>SECURE PAYLOAD</Text>
              <View style={styles.toolGrid}>
                <ToolButton icon="image" label="Image" onPress={() => pickMedia("image")} />
                <ToolButton icon="videocam" label="Video" onPress={() => pickMedia("video")} />
                <ToolButton icon="mic" label="Audio" onPress={() => pickDocument("audio")} />
                <ToolButton icon="document-text" label="Document" onPress={() => pickDocument("document")} />
                <ToolButton icon="navigate" label="Current loc." onPress={sendCurrentLocation} />
                <ToolButton icon="location" label="Desired loc." onPress={() => setDesiredLocationOpen(true)} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={desiredLocationOpen} transparent animationType="fade" onRequestClose={() => setDesiredLocationOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setDesiredLocationOpen(false)}>
            <Pressable style={styles.actionSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>DESIRED LOCATION</Text>
              <TextInput
                autoFocus
                placeholder="Address, coordinates, or maps link"
                placeholderTextColor={colors.faint}
                value={desiredLocation}
                onChangeText={setDesiredLocation}
                style={styles.locationInput}
              />
              <ActionRow icon="send" label="Send desired location" onPress={sendDesiredLocation} />
            </Pressable>
          </Pressable>
        </Modal>

        <Modal visible={securityOpen} transparent animationType="fade" onRequestClose={() => setSecurityOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSecurityOpen(false)}>
            <Pressable style={styles.actionSheet}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>CHAT INFORMATION</Text>
              <View style={styles.infoGrid}>
                <InfoCell label="HOST" value={peerCode} />
                <InfoCell label="THREAD" value={threadCode} />
                <InfoCell label="SESSION" value="AUTHENTICATED" />
                <InfoCell label="PRESENCE" value={presenceStatus} />
                <InfoCell label="TRANSPORT" value="HTTPS + REALTIME" />
                <InfoCell label="PAYLOAD" value="CLIENT ENCRYPTED" />
                <InfoCell label="VIEW WINDOW" value={viewWindowMode === "auto" ? "AUTO READ" : `${visibilitySeconds}s MANUAL`} />
                <InfoCell label="KEY MODEL" value="DEVICE-HELD KEYPAIR" />
              </View>
              <Text style={styles.optionTitle}>VIEW WINDOW</Text>
              <View style={styles.modeRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setViewWindowMode("auto")}
                  style={[styles.modeButton, viewWindowMode === "auto" && styles.modeButtonActive]}
                >
                  <Text style={[styles.modeText, viewWindowMode === "auto" && styles.modeTextActive]}>AUTO</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setViewWindowMode("manual")}
                  style={[styles.modeButton, viewWindowMode === "manual" && styles.modeButtonActive]}
                >
                  <Text style={[styles.modeText, viewWindowMode === "manual" && styles.modeTextActive]}>MANUAL</Text>
                </Pressable>
              </View>
              <View style={styles.segmentRow}>
                {VISIBILITY_OPTIONS.map((seconds) => (
                  <Pressable
                    accessibilityRole="button"
                    key={seconds}
                    onPress={() => {
                      setViewWindowMode("manual");
                      setVisibilitySeconds(seconds);
                    }}
                    style={[styles.segment, viewWindowMode === "manual" && visibilitySeconds === seconds && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, viewWindowMode === "manual" && visibilitySeconds === seconds && styles.segmentTextActive]}>{seconds}s</Text>
                  </Pressable>
                ))}
              </View>
              <ActionRow icon="copy-outline" label="Copy channel id" onPress={() => conversationId && copyText(conversationId, "Channel id")} />
              <ActionRow icon="sync-outline" label="Reload encrypted packets" onPress={reloadThread} />
              <ActionRow icon="exit-outline" label="Close channel" onPress={goBack} />
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

function ActionRow({ danger, icon, label, onPress }: { danger?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionRow}>
      <Ionicons name={icon} color={danger ? colors.danger : colors.green} size={20} />
      <Text style={[styles.actionLabel, danger && styles.actionLabelDanger]}>{label}</Text>
    </Pressable>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function ToolButton({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.toolButton}>
      <Ionicons name={icon} color={colors.green} size={22} />
      <Text style={styles.toolLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: colors.cream
  },
  headerIconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(120, 213, 188, 0.08)"
  },
  headerText: {
    flex: 1
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 18,
    fontWeight: "900"
  },
  status: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 11,
    marginTop: 3
  },
  messages: {
    flexGrow: 1,
    paddingTop: spacing.md,
    paddingBottom: spacing.md
  },
  empty: {
    color: colors.muted,
    fontFamily: fonts.mono,
    textAlign: "center",
    marginTop: spacing.xl
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  utilityButton: {
    width: 44,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(120, 213, 188, 0.08)"
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.07)",
    color: colors.text,
    fontFamily: fonts.mono,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream
  },
  sendDisabled: {
    opacity: 0.45
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.62)"
  },
  actionSheet: {
    margin: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(8, 18, 19, 0.98)",
    padding: spacing.md,
    gap: 6
  },
  toolGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  toolButton: {
    width: "31.5%",
    minHeight: 78,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(156, 194, 178, 0.12)",
    backgroundColor: "rgba(216, 232, 198, 0.04)"
  },
  toolLabel: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  },
  locationInput: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(216, 232, 198, 0.045)",
    color: colors.text,
    fontFamily: fonts.mono,
    paddingHorizontal: 14,
    fontSize: 14
  },
  sheetHandle: {
    alignSelf: "center",
    width: 42,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.borderStrong,
    marginBottom: 8
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 6
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8
  },
  infoCell: {
    width: "48%",
    minHeight: 52,
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(156, 194, 178, 0.12)",
    backgroundColor: "rgba(216, 232, 198, 0.04)",
    paddingHorizontal: 10
  },
  infoLabel: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: "900",
    marginBottom: 5
  },
  infoValue: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "900"
  },
  securityLine: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 3
  },
  optionTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 8
  },
  modeRow: {
    flexDirection: "row",
    gap: 8
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(120, 213, 188, 0.08)"
  },
  modeButtonActive: {
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(120, 213, 188, 0.22)"
  },
  modeText: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: "900"
  },
  modeTextActive: {
    color: colors.text
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8
  },
  segment: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(216, 232, 198, 0.045)"
  },
  segmentActive: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.cream
  },
  segmentText: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: colors.bg
  },
  actionRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(156, 194, 178, 0.10)",
    backgroundColor: "rgba(216, 232, 198, 0.045)"
  },
  actionLabel: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: "800"
  },
  actionLabelDanger: {
    color: colors.danger
  }
});
