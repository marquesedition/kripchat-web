import { StyleSheet, Text } from "react-native";
import { colors, fonts } from "@/lib/theme";

export function TypingIndicator({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <Text style={styles.text}>typing...</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.green,
    fontFamily: fonts.mono,
    fontSize: 12
  }
});

export default TypingIndicator;
