import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ChatListItem } from "@/components/ChatListItem";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { useAuthStore } from "@/features/auth/authStore";
import { useChatStore } from "@/features/chat/chatStore";
import { supabase } from "@/lib/supabase";
import { findApiErrorShape, getUserFacingErrorMessage } from "@/lib/userFeedback";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { normalizeUsername } from "@/lib/validation";
import { showBrowserMessageNotification } from "@/services/notifications";

type RealtimePayload = {
  new?: {
    id?: string;
    conversation_id?: string;
    sender_id?: string;
    sender_user_id?: string;
    recipient_id?: string;
    requester_id?: string;
    kind?: string;
    message_type?: string;
    status?: string;
  };
  old?: {
    id?: string;
    conversation_id?: string;
  };
};

export default function ChatListScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const previews = useChatStore((state) => state.previews);
  const requests = useChatStore((state) => state.requests);
  const loading = useChatStore((state) => state.previewLoading);
  const loadPreviews = useChatStore((state) => state.loadPreviews);
  const loadRequests = useChatStore((state) => state.loadRequests);
  const openDirect = useChatStore((state) => state.openDirect);
  const acceptRequest = useChatStore((state) => state.acceptRequest);
  const rejectRequest = useChatStore((state) => state.rejectRequest);
  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [newChatError, setNewChatError] = useState("");
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingInboundCount = requests.filter((request) => request.direction === "inbound" && request.status === "pending").length;
  const inboxStatus = loading ? "Refreshing secure channels" : pendingInboundCount ? `${pendingInboundCount} pending request` : "Encrypted inbox ready";
  const syncStatus = previews.some((item) => item.peerOnline) ? "Presence synced" : "No peers online";

  const refresh = useCallback(() => {
    if (userId) {
      Promise.all([loadPreviews(userId), loadRequests()]).catch((error) =>
        Alert.alert("Sync failed", getUserFacingErrorMessage(error, "Unable to sync channels."))
      );
    }
  }, [loadPreviews, loadRequests, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return undefined;

    const scheduleRefresh = (delay = 0) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        Promise.all([loadPreviews(userId), loadRequests()]).catch(() => undefined);
      }, delay);
    };

    const handleIncomingMessage = (payload: RealtimePayload) => {
      scheduleRefresh();
      const message = payload.new ?? {};
      const senderId = message.sender_id ?? message.sender_user_id;
      const kind = message.kind ?? message.message_type;
      if (!message.conversation_id || senderId === userId) return;

      showBrowserMessageNotification({
        title: "KripChat",
        body: kind === "text" ? "Nuevo paquete seguro recibido." : "Nuevo adjunto seguro recibido.",
        conversationId: message.conversation_id
      });
    };

    const handleInboxMutation = () => {
      scheduleRefresh();
    };

    const handleChatRequestMutation = (payload: RealtimePayload) => {
      scheduleRefresh();
      const request = payload.new;
      if (!request) return;

      if (request.recipient_id === userId && request.status === "pending") {
        showBrowserMessageNotification({
          title: "KripChat",
          body: "Nueva solicitud de chat recibida.",
          conversationId: request.conversation_id ?? ""
        });
      }

      if (request.requester_id === userId && request.status === "rejected") {
        Alert.alert("Solicitud rechazada", "La otra persona rechazó tu solicitud de chat.");
      }
    };

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, handleIncomingMessage)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "encrypted_messages" }, handleIncomingMessage)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "encrypted_messages" }, handleInboxMutation)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "conversations" }, handleInboxMutation)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_participants" }, handleInboxMutation)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "conversation_participants" }, handleInboxMutation)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_requests" }, handleChatRequestMutation)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_requests" }, handleChatRequestMutation)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [loadPreviews, loadRequests, userId]);

  async function createChat() {
    if (!userId) return;
    setNewChatError("");
    try {
      const result = await openDirect(userId, normalizeUsername(username));
      setModalOpen(false);
      setUsername("");
      if (result.status === "accepted" && result.conversationId) {
        router.push(`/chat/${result.conversationId}`);
        return;
      }

      const request = useChatStore.getState().requests.find((item) => item.id === result.requestId);
      if (request?.direction === "inbound") {
        Alert.alert(
          "Solicitud de chat pendiente",
          `@${request.peer.username} quiere abrir un canal contigo. Acepta para agregarlo al listado de chats.`,
          [
            { text: "Rechazar", style: "destructive", onPress: () => handleRejectRequest(request.id) },
            { text: "Aceptar", onPress: () => handleAcceptRequest(request.id) }
          ]
        );
        return;
      }

      Alert.alert("Solicitud enviada", "El canal se agregará cuando la otra persona acepte la solicitud.");
    } catch (error) {
      const message = getUserFacingErrorMessage(error, "Try another username.");
      const apiMessage = String(findApiErrorShape(error)?.message ?? "").trim();
      setNewChatError(apiMessage && !message.toLowerCase().includes(apiMessage.toLowerCase()) ? `${message}\n\n${apiMessage}` : message);
      Alert.alert("Could not open channel", message);
    }
  }

  async function handleAcceptRequest(requestId: string) {
    if (!userId) return;
    try {
      const conversationId = await acceptRequest(requestId, userId);
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      Alert.alert("No se pudo aceptar", getUserFacingErrorMessage(error, "No se pudo aceptar la solicitud."));
    }
  }

  async function handleRejectRequest(requestId: string) {
    if (!userId) return;
    try {
      await rejectRequest(requestId, userId);
      Alert.alert("Solicitud rechazada", "Se informará al solicitante en su inbox.");
    } catch (error) {
      Alert.alert("No se pudo rechazar", getUserFacingErrorMessage(error, "No se pudo rechazar la solicitud."));
    }
  }

  return (
    <ScreenShell>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Chats</Text>
            <Text style={styles.count}>{String(previews.length).padStart(2, "0")} channels</Text>
            <View style={styles.headerRule} />
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Refresh channels" accessibilityRole="button" onPress={refresh} style={styles.secondaryIconButton}>
              <Ionicons name="sync-outline" color={colors.text} size={18} />
            </Pressable>
            <Pressable accessibilityLabel="New secure channel" accessibilityRole="button" onPress={() => setModalOpen(true)} style={styles.iconButton}>
              <Ionicons name="add" color={colors.bg} size={21} />
            </Pressable>
          </View>
        </View>

        <View style={styles.networkStrip}>
          <Text style={styles.stripText}>{inboxStatus}</Text>
          <Text style={styles.stripText}>{syncStatus}</Text>
        </View>

        {loading && !previews.length ? <ActivityIndicator color={colors.green} style={styles.loader} /> : null}

        {requests.length ? (
          <View style={styles.requestPanel}>
            <Text style={styles.requestPanelTitle}>Inbox requests</Text>
            {requests.map((request) => (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestTextBlock}>
                  <Text style={styles.requestTitle} numberOfLines={1}>@{request.peer.username}</Text>
                  <Text style={styles.requestBody}>
                    {formatRequestCopy(request.direction, request.status)}
                  </Text>
                </View>
                {request.direction === "inbound" && request.status === "pending" ? (
                  <View style={styles.requestActions}>
                    <Pressable accessibilityRole="button" onPress={() => handleRejectRequest(request.id)} style={[styles.requestButton, styles.rejectButton]}>
                      <Ionicons name="close" color={colors.danger} size={18} />
                    </Pressable>
                    <Pressable accessibilityRole="button" onPress={() => handleAcceptRequest(request.id)} style={[styles.requestButton, styles.acceptButton]}>
                      <Ionicons name="checkmark" color={colors.bg} size={18} />
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        <FlatList
          data={previews}
          keyExtractor={(item) => item.conversation.id}
          renderItem={({ item }) => <ChatListItem item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl tintColor={colors.green} refreshing={loading} onRefresh={refresh} />}
          ListEmptyComponent={
            !loading ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>NO CONTACTS ONLINE</Text>
                <Text style={styles.emptyBody}>Open a direct encrypted channel by username.</Text>
              </GlassCard>
            ) : null
          }
        />
      </View>

      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
          <GlassCard style={styles.modalCard}>
            <Pressable>
              <Text style={styles.modalEyebrow}>DIRECT LINK</Text>
              <Text style={styles.modalTitle}>New secure channel</Text>
              <Text style={styles.modalCopy}>Enter the operator callsign to establish a private thread.</Text>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>PEER CALLSIGN</Text>
                <TextInput
                  autoCapitalize="none"
                  autoFocus
                  placeholder="peer_username"
                  placeholderTextColor={colors.faint}
                  value={username}
                  onChangeText={(value) => {
                    setUsername(normalizeUsername(value));
                    if (newChatError) setNewChatError("");
                  }}
                  style={styles.input}
                />
              </View>
              {newChatError ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorTitle}>No se pudo abrir el chat</Text>
                  <Text style={styles.errorText}>{newChatError}</Text>
                </View>
              ) : null}
              <View style={styles.modalActions}>
                <GlassButton label="Cancel" variant="secondary" onPress={() => setModalOpen(false)} style={styles.cancelButton} />
                <GlassButton label="Open channel" disabled={username.length < 3} onPress={createChat} style={styles.openButton} />
              </View>
            </Pressable>
          </GlassCard>
        </Pressable>
      </Modal>
    </ScreenShell>
  );
}

function formatRequestCopy(direction: "inbound" | "outbound", status: "pending" | "accepted" | "rejected") {
  if (direction === "inbound" && status === "pending") return "Quiere abrir un canal contigo.";
  if (direction === "outbound" && status === "pending") return "Esperando confirmación.";
  if (direction === "outbound" && status === "rejected") return "Solicitud rechazada.";
  if (status === "accepted") return "Solicitud aceptada.";
  return "Solicitud actualizada.";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sm
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0
  },
  count: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2
  },
  headerRule: {
    width: 64,
    height: 2,
    marginTop: 8,
    backgroundColor: colors.green,
    opacity: 0.5
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green
  },
  secondaryIconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surfaceStrong
  },
  networkStrip: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  stripText: {
    flex: 1,
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: "800"
  },
  loader: {
    marginTop: spacing.xl
  },
  list: {
    paddingBottom: 96
  },
  requestPanel: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 8
  },
  requestPanelTitle: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "900"
  },
  requestCard: {
    minHeight: 68,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(60, 255, 107, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  requestTextBlock: {
    flex: 1,
    minWidth: 0
  },
  requestTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 14,
    fontWeight: "900"
  },
  requestBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3
  },
  requestActions: {
    flexDirection: "row",
    gap: 8
  },
  requestButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center"
  },
  rejectButton: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 71, 87, 0.55)",
    backgroundColor: "rgba(255, 71, 87, 0.12)"
  },
  acceptButton: {
    backgroundColor: colors.green
  },
  emptyCard: {
    padding: spacing.lg,
    margin: spacing.md,
    marginTop: spacing.xl
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontWeight: "900",
    fontSize: 18
  },
  emptyBody: {
    color: colors.muted,
    fontFamily: fonts.mono,
    marginTop: 8,
    lineHeight: 20
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 0,
    backgroundColor: "rgba(0,0,0,0.58)"
  },
  modalCard: {
    width: "100%",
    padding: spacing.md,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0
  },
  modalEyebrow: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 8
  },
  modalTitle: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 22,
    fontWeight: "900"
  },
  modalCopy: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: spacing.lg
  },
  fieldGroup: {
    gap: 12
  },
  errorBox: {
    marginTop: spacing.md,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 107, 107, 0.55)",
    backgroundColor: "rgba(255, 107, 107, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  errorTitle: {
    color: "#ff8f8f",
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6
  },
  errorText: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18
  },
  label: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900"
  },
  input: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(216, 232, 198, 0.045)",
    color: colors.text,
    fontFamily: fonts.mono,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginTop: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(156, 194, 178, 0.14)"
  },
  cancelButton: {
    flex: 1,
    maxWidth: undefined
  },
  openButton: {
    flex: 1,
    maxWidth: undefined
  }
});
