import { Platform, StyleSheet } from "react-native";

export const colors = {
  bg: "#061012",
  bg2: "#0b181a",
  surface: "rgba(16, 30, 31, 0.74)",
  surfaceStrong: "rgba(25, 44, 43, 0.92)",
  panel: "rgba(12, 24, 25, 0.86)",
  row: "rgba(19, 36, 37, 0.78)",
  rowActive: "rgba(121, 190, 172, 0.72)",
  border: "rgba(156, 194, 178, 0.18)",
  borderStrong: "rgba(174, 219, 197, 0.48)",
  text: "#dbe8d4",
  muted: "#91a99f",
  faint: "#5f746f",
  green: "#78d5bc",
  blue: "#2a8494",
  cream: "#dfe8c6",
  danger: "#ff5370",
  warning: "#d9d9a3"
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 34
};

export const radii = {
  sm: 3,
  md: 6,
  lg: 10,
  pill: 999
};

export const fonts = {
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  sans: Platform.select({ ios: "Avenir Next", android: "sans-serif", default: undefined })
};

export const shadows = StyleSheet.create({
  glow: {
    shadowColor: colors.green,
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10
  },
  depth: {
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8
  }
});
