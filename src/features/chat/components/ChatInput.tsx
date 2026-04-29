import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors, radii, spacing } from "@/lib/theme";

export function ChatInput({ value, onChangeText, onSend }: { value: string; onChangeText: (value: string) => void; onSend: () => void }) {
  return (
    <View style={styles.wrap}>
      <TextInput
        multiline
        placeholder="Message"
        placeholderTextColor={colors.faint}
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
      />
      <Pressable accessibilityLabel="Send message" accessibilityRole="button" onPress={onSend} style={styles.button}>
        <Ionicons name="send" size={18} color={colors.bg} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    padding: spacing.sm
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.green
  }
});

export default ChatInput;
