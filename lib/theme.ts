import { Platform, StyleSheet } from "react-native";

export const colors = {
  bg: "#0d0f13",
  bg2: "#16181d",
  surface: "rgba(22, 24, 29, 0.92)",
  surfaceStrong: "rgba(31, 35, 41, 0.98)",
  panel: "rgba(26, 29, 35, 0.96)",
  row: "rgba(22, 24, 29, 0.82)",
  rowActive: "rgba(60, 255, 107, 0.10)",
  border: "#2a2e36",
  borderStrong: "rgba(60, 255, 107, 0.30)",
  text: "#e8eaed",
  muted: "#7d8590",
  faint: "#4a5160",
  green: "#3cff6b",
  blue: "#4dabf7",
  cream: "#e8eaed",
  danger: "#ff4757",
  warning: "#ffb84d"
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 34
};

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999
};

export const fonts = {
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  sans: Platform.select({ ios: "Avenir Next", android: "sans-serif", default: undefined })
};

export const shadows = StyleSheet.create({
  glow: {
    shadowColor: colors.green,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  },
  depth: {
    shadowColor: "#000",
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  }
});
