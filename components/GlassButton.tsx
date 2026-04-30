import { PropsWithChildren } from "react";
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { colors, radii } from "@/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PropsWithChildren<{
  label?: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}>;

export function GlassButton({ children, label, disabled, variant = "primary", style, onPress }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 18, stiffness: 260 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 16, stiffness: 240 });
      }}
      style={[styles.pressable, disabled && styles.disabled, animatedStyle, style]}
    >
      <View style={[styles.fill, getFillStyle(variant)]}>
        {children ?? (
          <Text style={[styles.label, variant === "secondary" && styles.secondaryLabel, variant === "danger" && styles.dangerLabel]}>
            {label}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}

function getFillStyle(variant: Props["variant"]) {
  if (variant === "danger") return styles.fillDanger;
  if (variant === "secondary") return styles.fillSecondary;
  return styles.fillPrimary;
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 46,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border
  },
  fill: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: radii.md
  },
  fillPrimary: {
    backgroundColor: colors.green
  },
  fillDanger: {
    backgroundColor: colors.danger
  },
  fillSecondary: {
    backgroundColor: colors.surfaceStrong
  },
  disabled: {
    opacity: 0.45
  },
  label: {
    color: colors.bg,
    fontWeight: "700",
    fontSize: 14
  },
  dangerLabel: {
    color: "#fff"
  },
  secondaryLabel: {
    color: colors.text
  }
});
