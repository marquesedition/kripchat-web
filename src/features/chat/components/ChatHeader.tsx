import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Avatar } from "@/components/Avatar";
import { colors, fonts, spacing } from "@/lib/theme";

export function ChatHeader({ username, displayName, avatarUrl, onBack }: { username: string; displayName?: string | null; avatarUrl?: string | null; onBack?: () => void }) {
  return (
    <View style={styles.wrap}>
      {onBack ? (
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <Avatar username={username} avatarUrl={avatarUrl ?? undefined} size={40} />
      <View style={styles.text}>
        <Text style={styles.name}>{displayName || username}</Text>
        <Text style={styles.username}>@{username}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  back: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  text: {
    flex: 1
  },
  name: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontWeight: "800"
  },
  username: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 11
  }
});

export default ChatHeader;
