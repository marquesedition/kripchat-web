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

export default function ChatListScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const previews = useChatStore((state) => state.previews);
  const loading = useChatStore((state) => state.previewLoading);
  const loadPreviews = useChatStore((state) => state.loadPreviews);
  const openDirect = useChatStore((state) => state.openDirect);
  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [newChatError, setNewChatError] = useState("");
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inboxStatus = loading ? "Refreshing secure channels" : "Encrypted inbox ready";
  const syncStatus = previews.some((item) => item.peerOnline) ? "Presence synced" : "No peers online";

  const refresh = useCallback(() => {
    if (userId) {
      loadPreviews(userId).catch((error) => Alert.alert("Sync failed", getUserFacingErrorMessage(error, "Unable to sync channels.")));
    }
  }, [loadPreviews, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!userId) return undefined;

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        loadPreviews(userId).catch(() => undefined);
      }, 250);
    };

    const handleIncomingMessage = (payload: { new: { conversation_id?: string; sender_id?: string; kind?: string } }) => {
      scheduleRefresh();
      const message = payload.new;
      if (!message.conversation_id || message.sender_id === userId) return;

      showBrowserMessageNotification({
        title: "KripChat",
        body: message.kind === "text" ? "Nuevo paquete seguro recibido." : "Nuevo adjunto seguro recibido.",
        conversationId: message.conversation_id
      });
    };

    const channel = supabase
      .channel(`inbox:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, handleIncomingMessage)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_participants" }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [loadPreviews, userId]);

  async function createChat() {
    if (!userId) return;
    setNewChatError("");
    try {
      const conversationId = await openDirect(userId, normalizeUsername(username));
      setModalOpen(false);
      setUsername("");
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      const message = getUserFacingErrorMessage(error, "Try another username.");
      const apiMessage = String(findApiErrorShape(error)?.message ?? "").trim();
      setNewChatError(apiMessage && !message.toLowerCase().includes(apiMessage.toLowerCase()) ? `${message}\n\n${apiMessage}` : message);
      Alert.alert("Could not open channel", message);
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
