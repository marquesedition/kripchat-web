import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ChatListItem } from "@/components/ChatListItem";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { ScreenShell } from "@/components/ScreenShell";
import { useAuthStore } from "@/features/auth/authStore";
import { useChatStore } from "@/features/chat/chatStore";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { normalizeUsername } from "@/lib/validation";

export default function ChatListScreen() {
  const userId = useAuthStore((state) => state.session?.user.id);
  const previews = useChatStore((state) => state.previews);
  const loading = useChatStore((state) => state.previewLoading);
  const loadPreviews = useChatStore((state) => state.loadPreviews);
  const openDirect = useChatStore((state) => state.openDirect);
  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState("");

  const refresh = useCallback(() => {
    if (userId) loadPreviews(userId).catch((error) => Alert.alert("Sync failed", error.message));
  }, [loadPreviews, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createChat() {
    if (!userId) return;
    try {
      const conversationId = await openDirect(userId, normalizeUsername(username));
      setModalOpen(false);
      setUsername("");
      router.push(`/chat/${conversationId}`);
    } catch (error) {
      Alert.alert("Could not open channel", error instanceof Error ? error.message : "Try another username.");
    }
  }

  return (
    <ScreenShell>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Contacts [{String(previews.length).padStart(2, "0")}]</Text>
            <View style={styles.headerRule} />
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Refresh channels" accessibilityRole="button" onPress={refresh} style={styles.ghostIconButton}>
              <Ionicons name="sync-outline" color={colors.green} size={18} />
            </Pressable>
            <Pressable accessibilityLabel="New secure channel" accessibilityRole="button" onPress={() => setModalOpen(true)} style={styles.iconButton}>
              <Ionicons name="add" color={colors.bg} size={21} />
            </Pressable>
          </View>
        </View>

        <View style={styles.networkStrip}>
          <Text style={styles.stripText}>DEVICE IP: 31.03.101.225</Text>
          <Text style={styles.stripText}>VPN IP: 18.197.063.031</Text>
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
                  onChangeText={(value) => setUsername(normalizeUsername(value))}
                  style={styles.input}
                />
              </View>
              <View style={styles.modalActions}>
                <GlassButton label="Cancel" variant="ghost" onPress={() => setModalOpen(false)} style={styles.cancelButton} />
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
    paddingHorizontal: spacing.md,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 0
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream
  },
  ghostIconButton: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(120, 213, 188, 0.08)"
  },
  networkStrip: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(184, 215, 197, 0.08)"
  },
  stripText: {
    flex: 1,
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 9,
    fontWeight: "800"
  },
  loader: {
    marginTop: spacing.xl
  },
  list: {
    paddingBottom: 110
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
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.58)"
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    padding: spacing.lg
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
    marginBottom: spacing.md
  },
  fieldGroup: {
    gap: 7
  },
  label: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 10,
    fontWeight: "900"
  },
  input: {
    height: 48,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: "rgba(216, 232, 198, 0.045)",
    color: colors.text,
    fontFamily: fonts.mono,
    paddingHorizontal: 14,
    fontSize: 15
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: spacing.md
  },
  cancelButton: {
    flex: 1,
    maxWidth: 130
  },
  openButton: {
    flex: 1,
    maxWidth: 170
  }
});
