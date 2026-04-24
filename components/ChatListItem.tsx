import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Avatar } from "@/components/Avatar";
import { createCipherPreview } from "@/lib/cryptoVisual";
import { colors, fonts } from "@/lib/theme";
import { formatOpsCode } from "@/lib/opsIdentity";
import type { ChatPreview } from "@/features/chat/types";

export function ChatListItem({ item }: { item: ChatPreview }) {
  const time = item.lastMessage ? new Date(item.lastMessage.created_at).toLocaleDateString([], { month: "short", day: "numeric" }) : "new";
  const opsCode = formatOpsCode(item.peer?.username);
  const preview = item.lastMessage
    ? createCipherPreview(item.lastMessage.body, item.lastMessage.client_id ?? item.lastMessage.id)
    : "No packets yet";

  return (
    <Pressable onPress={() => router.push(`/chat/${item.conversation.id}`)} style={styles.pressable}>
      <View style={styles.card}>
        <Avatar username={item.peer?.username} avatarUrl={item.peer?.avatar_url} online={item.peerOnline} size={42} />
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{opsCode}</Text>
            <View style={styles.statusGroup}>
              <View style={[styles.statusDot, item.peerOnline ? styles.onlineDot : styles.offlineDot]} />
              <Text style={styles.status}>{item.peerOnline ? "ONLINE" : "OFFLINE"}</Text>
            </View>
          </View>
          <Text style={styles.preview} numberOfLines={1}>
            {item.typing ? "incoming keystrokes..." : preview}
          </Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginBottom: 1
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 82,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(184, 215, 197, 0.08)",
    backgroundColor: colors.row
  },
  content: {
    flex: 1,
    minWidth: 0
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  title: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 18,
    fontWeight: "800",
    flex: 1
  },
  time: {
    color: colors.faint,
    fontFamily: fonts.mono,
    fontSize: 10,
    textTransform: "uppercase"
  },
  statusGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  onlineDot: {
    backgroundColor: colors.green
  },
  offlineDot: {
    backgroundColor: colors.warning
  },
  status: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 11,
    fontWeight: "800"
  },
  preview: {
    marginTop: 4,
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 13
  }
});
