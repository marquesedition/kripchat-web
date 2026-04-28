import { PropsWithChildren } from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { colors, radii, shadows } from "@/lib/theme";

type Props = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
}>;

export function GlassCard({ children, style, interactive = false }: Props) {
  const glassStyle = [styles.card, style];

  if (Platform.OS === "ios" && isGlassEffectAPIAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        tintColor="rgba(60, 255, 107, 0.06)"
        isInteractive={interactive}
        style={glassStyle}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <BlurView intensity={34} tint="dark" style={glassStyle}>
      <View style={styles.androidTint}>{children}</View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: "hidden",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.depth
  },
  androidTint: {
    flex: 1,
    backgroundColor: "rgba(22, 24, 29, 0.68)"
  }
});
