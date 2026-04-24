import { PropsWithChildren } from "react";
import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radii } from "@/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PropsWithChildren<{
  label?: string;
  disabled?: boolean;
  variant?: "primary" | "ghost" | "danger";
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
      <LinearGradient
        colors={getGradient(variant)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fill, variant === "ghost" && styles.ghost]}
      >
        {children ?? <Text style={[styles.label, variant === "danger" && styles.dangerLabel]}>{label}</Text>}
      </LinearGradient>
    </AnimatedPressable>
  );
}

function getGradient(variant: Props["variant"]) {
  if (variant === "danger") return ["rgba(116, 43, 56, 0.96)", "rgba(81, 34, 45, 0.92)"] as const;
  if (variant === "ghost") return ["rgba(216, 232, 198, 0.035)", "rgba(120, 213, 188, 0.055)"] as const;
  return ["rgba(216, 232, 198, 0.96)", "rgba(120, 213, 188, 0.72)"] as const;
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 46,
    borderRadius: radii.md,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong
  },
  fill: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: radii.md
  },
  ghost: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong
  },
  disabled: {
    opacity: 0.45
  },
  label: {
    color: "#02110d",
    fontWeight: "900",
    fontSize: 13
  },
  dangerLabel: {
    color: colors.text
  }
});
