import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

export function AttachmentButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityLabel="Attach encrypted file" accessibilityRole="button" onPress={onPress} style={styles.button}>
      <Ionicons name="attach" size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  }
});

export default AttachmentButton;
